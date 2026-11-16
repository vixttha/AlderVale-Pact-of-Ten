# Languages and test opportunities for AlderVale

The [GitHub Linguist registry](https://github.com/github-linguist/linguist/blob/14ac04abe3e3722e42c52489b377d9d4118fc8b6/lib/linguist/languages.yml) classifies 573 entries as `programming` at this revision. That snapshot defines the inventory here, including dialects, domain-specific languages and build tool languages. Separately, Linguist lists 187 data, 71 markup and 18 prose entries. This inventory records candidate uses. Check the [project cases](cases.md) and runner receipts for executed coverage.

## Test ideas by language

| Language or format | AlderVale test | Use in this project |
|---|---|---|
| TypeScript with Vitest | First Spark pays exactly once, XP rolls over at exact thresholds, rank caps, and guest saves recover from invalid JSON without touching another realm. | Existing and expanded in this PR |
| JavaScript with Playwright | Complete title, wizard creation, Breeze solo duel and reload in Chromium, Firefox and WebKit. Also verify offline HUD, Tailor HP and fallback. | Existing |
| Node.js JavaScript | Start built server, check health and HTML, then exchange chat with isolated realm fixtures. | Existing |
| Python | Validate case IDs and optional topic coverage. Later compare combat replay totals from a fixed export against an independent model. | Catalog check exists. Replay proposed. |
| Go | Run a small health-handler fixture for the starter kit. A normal client can later verify the documented realm socket reconnect contract. | Starter fixture exists. Game client proposed. |
| Ruby | Parse an exported quest and NPC catalog, assert that every quest giver resolves, and check localized text and encoding. | Proposed |
| C# | Independently deserialize versioned synthetic saves and preserve realm, wallet, active creature, and quest flags. | Proposed |
| Rust | Check Rowan GLB chunk sizes, accessors and animation tracks against the asset contract. | Proposed |
| Haskell or F# | Model a deterministic combat round and compare damage, status expiration and draw outcomes over shared fixtures. | Proposed |
| R or Julia | Analyze duel wins, round duration and balance variance against a fixed seed corpus. | Proposed |
| Bash and PowerShell | Verify build and launcher paths with spaces and deterministic exit codes on their supported runner OS. | Proposed launcher checks |
| Firestore Rules and Java | Execute Rules checks and save transactions in the Java-backed demo emulator. | Existing |
| HTML and CSS | Check accessible names, focus, responsive controls and 200%/400% zoom. | Narrow enrollment exists. Zoom proposed. |
| GLSL or WGSL | Check shader compilation and fallback for the actual shipped renderer. WebGPU-specific checks depend on adopting it. | Conditional |
| Gherkin | Give the owner desktop First Spark playthrough a readable, versioned scenario linked to the executed result. | Proposed format |
| SQL | Check atomic balances and rollback against an actual relational adapter when one exists. | Conditional |
| JSON and YAML | Validate shared fixtures, test receipts, and Actions configuration. | Existing catalog and workflow checks |
| TLA+, Alloy or SMT | Model quest completion and one-time reward issuance, then compare counterexample scenarios to game tests. | Proposed |

For the current milestone, use the existing TypeScript, JavaScript, and demo emulator lanes. For cross-language work, prefer the same input fixtures and an independently derived expected result. A test receipt records the exact checkout, event, attempt, and job.

## All programming entries in the pinned registry

### Game rules and independent calculations (77)

Compare fixed XP boundaries, rank and reward balances with the game, or model a quest as a finite state machine. Use the same repository-versioned inputs with independently derived expected values.

`TypeScript`, `JavaScript`, `TSX`, `Python`, `Ruby`, `Go`, `Rust`, `C#`, `F#`, `Java`, `Kotlin`, `Scala`, `Groovy`, `Clojure`, `OCaml`, `Haskell`, `Racket`, `Common Lisp`, `Scheme`, `Standard ML`, `Futhark`, `Julia`, `R`, `Fortran`, `Fortran Free Form`, `MATLAB`, `NumPy`, `Wolfram Language`, `APL`, `BQN`, `J`, `Ada`, `Nim`, `D`, `Zig`, `C`, `C++`, `Crystal`, `Elixir`, `Erlang`, `Dart`, `Swift`, `PHP`, `Perl`, `Raku`, `Lua`, `Luau`, `Pascal`, `Nemerle`, `Idris`, `Agda`, `Koka`, `F*`, `Roc`, `PureScript`, `ReScript`, `Reason`, `Curry`, `Dafny`, `Lean`, `Lean 4`, `Rocq Prover`, `Isabelle`, `TLA`, `Alloy`, `Boogie`, `SMT`, `Promela`, `B (Formal Method)`, `PDDL`, `Prolog`, `CLIPS`, `Logtalk`, `AMPL`, `GAMS`, `MiniZinc`, `Answer Set Programming`.

### Browser, UI and port compatibility (69)

Check title → guest → campus → duel → reload, focus order and accessible names. A port-specific language has value when AlderVale actually ships that client or integration.

`Elm`, `Imba`, `JavaScript+ERB`, `Glimmer JS`, `Glimmer TS`, `ASP.NET`, `Classic ASP`, `ColdFusion`, `ColdFusion CFC`, `CartoCSS`, `QML`, `Qt Script`, `FreeMarker`, `Java Server Pages`, `Java Template Engine`, `Groovy Server Pages`, `Genshi`, `Mako`, `Smarty`, `Hack`, `ActionScript`, `AviSynth`, `Processing`, `Haxe`, `GDScript`, `Game Maker Language`, `AGS Script`, `BlitzBasic`, `BlitzMax`, `AngelScript`, `DM`, `Inform 7`, `Ink`, `Ren'Py`, `Verse`, `UnrealScript`, `Witcher Script`, `SQF`, `Papyrus`, `Redscript`, `Squirrel`, `MiniScript`, `Monkey`, `Monkey C`, `Lobster`, `GSC`, `JASS`, `NWScript`, `Quake`, `QuakeC`, `SourcePawn`, `ZIL`, `Visual Basic .NET`, `Objective-C`, `Objective-C++`, `Objective-J`, `Uno`, `Xojo`, `REALbasic`, `WebIDL`, `B4X`, `AIDL`, `ArkTS`, `CoffeeScript`, `Literate CoffeeScript`, `EmberScript`, `LiveScript`, `MoonScript`, `RobotFramework`.

### Build, release and configuration (56)

Verify the locked build, clean checkout behavior, Windows launcher and branch workflows. Only test an alternate configuration system when the repo uses it.

`Shell`, `fish`, `PowerShell`, `Batchfile`, `VBScript`, `AppleScript`, `AutoHotkey`, `AutoIt`, `Xonsh`, `Elvish`, `Tcsh`, `Nushell`, `Awk`, `sed`, `jq`, `Tcl`, `DIGITAL Command Language`, `JCL`, `REXX`, `CMake`, `Makefile`, `Meson`, `Dune`, `QMake`, `Just`, `Earthly`, `Dockerfile`, `Nix`, `Xmake`, `BitBake`, `Gentoo Ebuild`, `Gentoo Eclass`, `Alpine Abuild`, `Inno Setup`, `NSIS`, `Starlark`, `Bicep`, `HCL`, `Salt`, `Puppet`, `OpenRC runscript`, `Augeas`, `CUE`, `Dhall`, `Jsonnet`, `Nickel`, `Pkl`, `KCL`, `Common Workflow Language`, `Nextflow`, `Snakemake`, `WDL`, `Sieve`, `Procfile`, `Open Policy Agent`, `Cedar`.

### Save data, wire formats and compatibility (57)

Read a synthetic guest save and verify schema version, realm, wallet, and quest flags, or check a specified API/WS contract. Use a database-specific language only for an adopted data store or import path.

`COBOL`, `RPGLE`, `xBase`, `ABAP`, `ABAP CDS`, `CAP CDS`, `DataWeave`, `Hurl`, `Thrift`, `Smithy`, `Cap'n Proto`, `Kaitai Struct`, `TypeSpec`, `Ragel`, `ANTLR`, `Lex`, `JFlex`, `Yacc`, `Bison`, `Jison`, `Jison Lex`, `PEG.js`, `Nearley`, `Langium`, `Slice`, `RPC`, `Apex`, `AL`, `PLSQL`, `PLpgSQL`, `TSQL`, `CQL`, `Cypher`, `EdgeQL`, `HiveQL`, `SQLPL`, `SurrealQL`, `JSONiq`, `XQuery`, `XSLT`, `XProc`, `PigLatin`, `Power Query`, `LookML`, `ECL`, `4D`, `Clarion`, `Filebench WML`, `OpenEdge ABL`, `PowerBuilder`, `ObjectScript`, `Genero 4gl`, `Harbour`, `Pan`, `Rascal`, `JetBrains MPS`, `TXL`.

### Rendering, asset and audio validation (42)

Check Rowan GLB structure or capture fixed animation/fallback states. Run shader- and device-specific checks only for the renderer or audio path that ships.

`GLSL`, `HLSL`, `WGSL`, `WESL`, `Slang`, `GDShader`, `ShaderLab`, `Metal`, `OpenCL`, `Cuda`, `HIP`, `ISPC`, `Filterscript`, `RenderScript`, `WebAssembly`, `Assembly`, `Unix Assembly`, `Motorola 68K Assembly`, `IL Assembly`, `LLVM`, `LLVM TableGen`, `MLIR`, `ImHex Pattern Language`, `OpenSCAD`, `POV-Ray SDL`, `Asymptote`, `Gnuplot`, `Liquidsoap`, `Faust`, `SuperCollider`, `Csound`, `Csound Document`, `Csound Score`, `ChucK`, `Praat`, `Max`, `LilyPond`, `SAS`, `Stan`, `ImageJ Macro`, `MAXScript`, `G-code`.

### Unassigned or conditional ecosystems (272)

No current test assigned. Add a specific case only when a corresponding runtime, adapter, format or device is part of AlderVale, or an independent model justifies the tool.

`1C Enterprise`, `ALGOL`, `ASL`, `ATS`, `Aiken`, `Aleo`, `Apollo Guidance Computer`, `Arc`, `AspectJ`, `B`, `BAML`, `BASIC`, `Ballerina`, `Beef`, `Befunge`, `Bend`, `Berry`, `BibTeX Style`, `Bluespec`, `Bluespec BH`, `Boo`, `Brainfuck`, `BrighterScript`, `Brightscript`, `C2hs Haskell`, `C3`, `CWeb`, `Cadence`, `Cairo`, `Cairo Zero`, `CameLIGO`, `Cangjie`, `Carbon`, `Ceylon`, `Chapel`, `Charity`, `Circom`, `Cirru`, `Clarity`, `Clean`, `Click`, `Clue`, `CodeQL`, `Component Pascal`, `Cool`, `Cycript`, `Cython`, `DTrace`, `Daslang`, `DenizenScript`, `Dogescript`, `Dylan`, `E`, `ECLiPSe`, `EQ`, `EasyCrypt`, `Eiffel`, `Elvish Transcript`, `Emacs Lisp`, `Euphoria`, `FIRRTL`, `FLUX`, `FPP`, `Factor`, `Fancy`, `Fantom`, `Fennel`, `Flix`, `Fluent`, `Forth`, `FreeBASIC`, `Frege`, `GAML`, `GAP`, `GCC Machine Description`, `GDB`, `Genie`, `Gherkin`, `Gleam`, `Glyph`, `Gno`, `Golo`, `Goose`, `Gosu`, `Grace`, `Grammatical Framework`, `Hare`, `HolyC`, `Hy`, `HyPhy`, `IDL`, `IGOR Pro`, `Io`, `Ioke`, `Isabelle ROOT`, `Jac`, `Jai`, `Janet`, `Jasmin`, `Jolie`, `Julia REPL`, `KFramework`, `KRL`, `KakouneScript`, `KerML`, `KerboScript`, `KoLmafia ASH`, `LFE`, `LOLCODE`, `LSL`, `LabVIEW`, `Lambdapi`, `Lasso`, `Leo`, `LigoLANG`, `Limbo`, `Linear Programming`, `Linker Script`, `Literate Agda`, `Literate Haskell`, `LiveCode Script`, `Logos`, `LoomScript`, `M`, `M4`, `M4Sugar`, `METAFONT`, `MQL4`, `MQL5`, `MUF`, `Macaulay2`, `Mathematical Programming System`, `MeTTa`, `Mercury`, `MetaPost`, `MiniD`, `Mint`, `Mirah`, `Modelica`, `Modula-2`, `Modula-3`, `Module Management System`, `Mojo`, `Moocode`, `MoonBit`, `Motoko`, `Move`, `Myghty`, `NASL`, `NCL`, `NMODL`, `Nasal`, `NetLinx`, `NetLinx+ERB`, `NetLogo`, `NewLisp`, `Nit`, `Noir`, `Nu`, `OMNeT++ MSG`, `OMNeT++ NED`, `Oberon`, `Odin`, `Omgrofl`, `Opa`, `Opal`, `OpenQASM`, `OverPy`, `OverpassQL`, `Ox`, `Oxygene`, `Oz`, `P4`, `Pact`, `Parrot`, `Parrot Assembly`, `Parrot Internal Representation`, `Pawn`, `Pep8`, `PicoLisp`, `Pike`, `PogoScript`, `Polar`, `Pony`, `Portugol`, `Pro*C`, `Propeller Spin`, `PureBasic`, `Pyret`, `Python console`, `Q#`, `QuickBASIC`, `Quint`, `RAScript`, `ReasonLIGO`, `Rebol`, `Red`, `Redcode`, `Rez`, `Rhai`, `Ring`, `Rouge`, `RouterOS Script`, `SIP`, `SWIG`, `Sage`, `Sail`, `Scenic`, `Scilab`, `Self`, `ShellSession`, `Shen`, `Singularity`, `Slash`, `SmPL`, `Smali`, `Smalltalk`, `Solidity`, `Stata`, `Sway`, `SysML`, `SystemVerilog`, `TI Program`, `TL-Verilog`, `TSRX`, `Tact`, `Talon`, `Tape`, `Teal`, `Terra`, `Toit`, `Tolk`, `Turing`, `Typst`, `Uiua`, `Unified Parallel C`, `Untyped Plutus Core`, `UrWeb`, `V`, `VBA`, `VCL`, `VHDL`, `Vala`, `Verilog`, `Vim script`, `Visual Basic 6.0`, `Volt`, `Vyper`, `Whiley`, `Wollok`, `Wren`, `X10`, `XC`, `XS`, `Xtend`, `YARA`, `Yul`, `ZAP`, `Zeek`, `ZenScript`, `Zephir`, `Zimpl`, `eC`, `hoon`, `mIRC Script`, `mcfunction`, `mupad`, `nesC`, `ooc`, `q`, `ucode`, `wisp`.
