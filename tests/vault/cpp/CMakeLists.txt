cmake_minimum_required(VERSION 3.20)
project(aldervale_cpp_contracts LANGUAGES CXX)

enable_testing()
add_executable(aldervale_cpp_contracts contracts.cpp)
set_target_properties(aldervale_cpp_contracts PROPERTIES
    CXX_STANDARD 20
    CXX_STANDARD_REQUIRED ON
    CXX_EXTENSIONS OFF
)

function(contract_case id label mutation_scenario mutation)
    add_test(NAME "${id}.${label}" COMMAND aldervale_cpp_contracts
        "${id}" "${CMAKE_CURRENT_SOURCE_DIR}/expected-v1.tsv"
        "${CMAKE_CURRENT_BINARY_DIR}/observed-v1.tsv" "${mutation_scenario}" "${mutation}")
    set_tests_properties("${id}.${label}" PROPERTIES TIMEOUT 10)
endfunction()

contract_case(G06-001 damage damage-floor [=[{"crit":false,"damage":0,"finalElement":"ember"}]=])
contract_case(G06-002 health pip-boundaries [=[{"counts":[5,2,1]}]=])
contract_case(G06-003 turn-order allies-forward [=[{"hp":290,"lastHit":"ember"}]=])
contract_case(G28-007 guest-save reward-after-reload
    [=[{"completed":["q_first_duel"],"florins":440,"shards":10,"xp":180}]=])
contract_case(G09-002 replay mutual-knockout
    [=[{"cardsCast":[0,0],"enemyStatuses":[],"hp":[0,0],"phase":"victory","regularPips":[2,2],"round":1}]=])
