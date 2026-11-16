package presence_test

import "testing"

func TestG3004ReconnectPreservesIdentity(t *testing.T) {
	endpoint := startRealmServer(t)
	location := place{"breeze", "hub"}
	observer := join(t, endpoint, "observer", location, "")
	first := join(t, endpoint, "returning-guest", location, "")
	disconnect(t, first, observer)

	returned := join(t, endpoint, "returning-guest", location, first.ticket)
	requireIdentity(t, first.self, returned.self, true)

	changed := returned.self
	changed.WizardID = "fixture-new-wizard"
	if checkIdentity(first.self, changed, true) == nil {
		t.Fatal("identity check accepted a changed wizard ID")
	}
}

func TestG3005DisconnectRemovesOldPresence(t *testing.T) {
	endpoint := startRealmServer(t)
	location := place{"breeze", "hub"}
	staying := join(t, endpoint, "staying-guest", location, "")
	departing := join(t, endpoint, "departing-guest", location, "")
	requireRoster(t, departing.roster, staying.self, departing.self)
	disconnect(t, departing, staying)

	probe := join(t, endpoint, "new-observer", location, "")
	requireRoster(t, probe.roster, probe.self, staying.self)

	if checkRoster([]player{probe.self, staying.self, departing.self}, probe.self, staying.self) == nil {
		t.Fatal("roster check accepted a stale connection")
	}
}

func TestG3006ReconnectReturnsScopedRoster(t *testing.T) {
	endpoint := startRealmServer(t)
	location := place{"breeze", "hub"}
	staying := join(t, endpoint, "same-zone", location, "")
	otherZone := join(t, endpoint, "other-zone", place{"breeze", "arbor"}, "")
	otherRealm := join(t, endpoint, "other-realm", place{"everpeak", "hub"}, "")
	first := join(t, endpoint, "returning-guest", location, "")
	disconnect(t, first, staying)

	returned := join(t, endpoint, "returning-guest", location, first.ticket)
	requireIdentity(t, first.self, returned.self, true)
	requireRoster(t, returned.roster, returned.self, staying.self)

	for _, unexpected := range []player{first.self, otherZone.self, otherRealm.self} {
		injected := []player{returned.self, staying.self, unexpected}
		if checkRoster(injected, returned.self, staying.self) == nil {
			t.Fatalf("roster check accepted %s", unexpected.Name)
		}
	}
}

func TestG3007ZoneChangeUpdatesBothSides(t *testing.T) {
	endpoint := startRealmServer(t)
	for _, route := range []struct{ realm, from, to string }{
		{"breeze", "hub", "arbor"},
		{"horizon", "amphitheater", "hub"},
	} {
		t.Run(route.realm, func(t *testing.T) {
			oldObserver := join(t, endpoint, "old-zone-observer", place{route.realm, route.from}, "")
			newObserver := join(t, endpoint, "new-zone-observer", place{route.realm, route.to}, "")
			moving := join(t, endpoint, "moving-guest", place{route.realm, route.from}, "")
			requireRoster(t, moving.roster, moving.self, oldObserver.self)

			send(t, moving.conn, moving.self.Name, map[string]string{"type": "move", "zone": route.to})
			left := receive(t, oldObserver.conn, oldObserver.self.Name, "player_left")
			if left.SessionID != moving.self.SessionID {
				t.Fatalf("old zone saw connection %q leave, want %q", left.SessionID, moving.self.SessionID)
			}
			expected := moving.self
			expected.Zone = route.to
			arrival := receive(t, newObserver.conn, newObserver.self.Name, "player_joined")
			if arrival.Player != expected {
				t.Fatalf("new zone arrival: got %+v, want %+v", arrival.Player, expected)
			}
			snapshot := receive(t, moving.conn, moving.self.Name, "zone_snapshot")
			requireRoster(t, snapshot.Players, expected, newObserver.self)

			wrongZone := expected
			wrongZone.Zone = route.from
			if checkRoster([]player{wrongZone, newObserver.self}, expected, newObserver.self) == nil {
				t.Fatal("roster check accepted a player with the old zone")
			}
		})
	}
}

func TestG3008FreshGuestDoesNotResumeOldIdentity(t *testing.T) {
	endpoint := startRealmServer(t)
	location := place{"breeze", "hub"}
	observer := join(t, endpoint, "observer", location, "")
	first := join(t, endpoint, "same-display-name", location, "")
	disconnect(t, first, observer)

	fresh := join(t, endpoint, "same-display-name", location, "")
	requireIdentity(t, first.self, fresh.self, false)
	requireRoster(t, fresh.roster, fresh.self, observer.self)

	reused := fresh.self
	reused.WizardID = first.self.WizardID
	if checkIdentity(first.self, reused, false) == nil {
		t.Fatal("fresh-identity check accepted the previous wizard ID")
	}
}
