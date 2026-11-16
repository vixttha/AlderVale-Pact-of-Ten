package presence_test

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"slices"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"
)

const eventTimeout = 8 * time.Second

type player struct {
	Name      string `json:"name"`
	WizardID  string `json:"wizardId"`
	SessionID string `json:"sessionId"`
	Realm     string `json:"realmId"`
	Zone      string `json:"zone"`
}

type event struct {
	Type      string   `json:"type"`
	Ticket    string   `json:"ticket"`
	SessionID string   `json:"sessionId"`
	Players   []player `json:"players"`
	Player    player   `json:"player"`
}

type guest struct {
	conn   *websocket.Conn
	ticket string
	self   player
	roster []player
}

type place struct {
	realm string
	zone  string
}

func startRealmServer(t *testing.T) string {
	t.Helper()

	dir := t.TempDir()
	ready := filepath.Join(dir, "port")
	root, err := filepath.Abs("../../..")
	if err != nil {
		t.Fatal(err)
	}

	cmd := exec.CommandContext(t.Context(), "node", "tests/vault/go/server-fixture.mjs", ready)
	cmd.Dir = root
	// Use a fresh process without inherited production credentials or .env values.
	cmd.Env = []string{
		"PATH=" + os.Getenv("PATH"),
		"NODE_ENV=production",
		"VITEST=true",
		"DOTENV_CONFIG_PATH=" + filepath.Join(dir, "unused.env"),
	}
	diagnostics, err := os.Create(filepath.Join(dir, "server.log"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = diagnostics.Close() })
	cmd.Stdout, cmd.Stderr = diagnostics, diagnostics
	if err := cmd.Start(); err != nil {
		t.Fatalf("start realm server: %v", err)
	}

	done := make(chan struct{})
	var exitErr error
	go func() {
		exitErr = cmd.Wait()
		close(done)
	}()
	t.Cleanup(func() {
		select {
		case <-done:
		default:
			_ = cmd.Process.Kill()
			<-done
		}
	})

	ctx, cancel := context.WithTimeout(t.Context(), 15*time.Second)
	defer cancel()
	tick := time.NewTicker(25 * time.Millisecond)
	defer tick.Stop()
	for {
		data, err := os.ReadFile(ready)
		if err == nil {
			port, parseErr := strconv.Atoi(string(data))
			if parseErr == nil && port > 0 && port <= 65535 {
				return "ws://" + net.JoinHostPort("127.0.0.1", strconv.Itoa(port)) + "/ws"
			}
		} else if !os.IsNotExist(err) {
			t.Fatalf("read realm server readiness file: %v", err)
		}
		select {
		case <-done:
			t.Fatalf("realm server exited before listening: %v\n%s", exitErr, serverLog(diagnostics.Name()))
		case <-ctx.Done():
			t.Fatalf("realm server did not report its assigned port: %v\n%s", ctx.Err(), serverLog(diagnostics.Name()))
		case <-tick.C:
		}
	}
}

func serverLog(path string) string {
	file, err := os.Open(path)
	if err != nil {
		return ""
	}
	defer file.Close()

	buf := make([]byte, 4096)
	n, _ := file.Read(buf)
	return string(buf[:n])
}

func receive(t *testing.T, conn *websocket.Conn, label, want string) event {
	t.Helper()

	ctx, cancel := context.WithTimeout(t.Context(), eventTimeout)
	defer cancel()
	var seen []string
	for len(seen) < 128 {
		var frame event
		if err := wsjson.Read(ctx, conn, &frame); err != nil {
			t.Fatalf("%s: waiting for %q after event types %v: %v", label, want, seen, err)
		}
		switch frame.Type {
		case want:
			return frame
		case "world_notice":
			t.Fatalf("%s: server refused the fixture while waiting for %q", label, want)
		default:
			seen = append(seen, frame.Type)
		}
	}
	t.Fatalf("%s: too many messages while waiting for %q; event types %v", label, want, seen)
	return event{}
}

func send(t *testing.T, conn *websocket.Conn, label string, payload any) {
	t.Helper()

	ctx, cancel := context.WithTimeout(t.Context(), eventTimeout)
	defer cancel()
	if err := wsjson.Write(ctx, conn, payload); err != nil {
		t.Fatalf("%s: send command: %v", label, err)
	}
}

func join(t *testing.T, endpoint, name string, at place, ticket string) guest {
	t.Helper()

	ctx, cancel := context.WithTimeout(t.Context(), eventTimeout)
	defer cancel()
	conn, _, err := websocket.Dial(ctx, endpoint, &websocket.DialOptions{
		HTTPClient: &http.Client{Transport: &http.Transport{}},
	})
	if err != nil {
		t.Fatalf("%s: connect to realm fixture: %v", name, err)
	}
	conn.SetReadLimit(64 << 10)
	t.Cleanup(func() { _ = conn.CloseNow() })

	welcome := receive(t, conn, name, "welcome")
	if welcome.SessionID == "" {
		t.Fatalf("%s: welcome omitted the connection ID", name)
	}
	// Protocol events are server-generated. The ticket is only kept in memory.
	payload := map[string]any{
		"type": "join_world",
		"presence": map[string]any{
			"name": name, "realmId": at.realm, "zone": at.zone,
			"raceId": "human", "elementId": "ember", "level": 1, "rank": 1,
		},
	}
	if ticket != "" {
		payload["guestTicket"] = ticket
	}
	send(t, conn, name, payload)
	grant := receive(t, conn, name, "guest_ticket")
	if grant.Ticket == "" {
		t.Fatalf("%s: server omitted the guest ticket", name)
	}
	receive(t, conn, name, "world_joined")
	snapshot := receive(t, conn, name, "zone_snapshot")

	for _, p := range snapshot.Players {
		if p.SessionID == welcome.SessionID {
			if p.WizardID == "" || p.Name != name || p.Realm != at.realm || p.Zone != at.zone {
				t.Fatalf("%s: invalid self-presence in snapshot: %+v", name, p)
			}
			return guest{conn: conn, ticket: grant.Ticket, self: p, roster: snapshot.Players}
		}
	}
	t.Fatalf("%s: snapshot omitted the welcomed connection %q", name, welcome.SessionID)
	return guest{}
}

func disconnect(t *testing.T, departing, observer guest) {
	t.Helper()

	if err := departing.conn.CloseNow(); err != nil {
		t.Fatalf("%s: disconnect: %v", departing.self.Name, err)
	}
	left := receive(t, observer.conn, observer.self.Name, "player_left")
	if left.SessionID != departing.self.SessionID {
		t.Fatalf("%s: player_left named connection %q, want %q", observer.self.Name, left.SessionID, departing.self.SessionID)
	}
}

func checkRoster(got []player, want ...player) error {
	// Compare the full set of typed presence records, including identity and location.
	format := func(players []player) []string {
		keys := make([]string, 0, len(players))
		for _, p := range players {
			keys = append(keys, fmt.Sprintf("%q/%q/%q/%q/%q", p.Realm, p.Zone, p.Name, p.WizardID, p.SessionID))
		}
		slices.Sort(keys)
		return keys
	}
	actual, expected := format(got), format(want)
	if !slices.Equal(actual, expected) {
		return fmt.Errorf("roster mismatch\n  want %s\n  got  %s", strings.Join(expected, ", "), strings.Join(actual, ", "))
	}
	return nil
}

func requireRoster(t *testing.T, got []player, want ...player) {
	t.Helper()

	if err := checkRoster(got, want...); err != nil {
		t.Fatal(err)
	}
}

func checkIdentity(previous, current player, resume bool) error {
	if current.SessionID == "" || previous.SessionID == current.SessionID {
		return fmt.Errorf("expected a fresh connection ID, got %q", current.SessionID)
	}
	if current.WizardID == "" || (previous.WizardID == current.WizardID) != resume {
		return fmt.Errorf("guest identity mismatch (resume=%t): previous %q, current %q", resume, previous.WizardID, current.WizardID)
	}
	return nil
}

func requireIdentity(t *testing.T, previous, current player, resume bool) {
	t.Helper()

	if err := checkIdentity(previous, current, resume); err != nil {
		t.Fatal(err)
	}
}
