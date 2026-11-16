#include <algorithm>
#include <fstream>
#include <iostream>
#include <map>
#include <stdexcept>
#include <string>
#include <string_view>

namespace {

using Records = std::map<std::string, std::string>;

Records read_suite(const char* path, std::string_view suite) {
    std::ifstream source(path);
    std::string line;
    if (!std::getline(source, line) || line != "aldervale-cpp-contract-v1") {
        throw std::runtime_error(std::string(path) + ": missing or unsupported observation format");
    }

    Records records;
    int line_number = 1;
    while (std::getline(source, line)) {
        ++line_number;
        const auto first = line.find('\t');
        const auto second = first == std::string::npos ? first : line.find('\t', first + 1);
        if (first == 0 || second == std::string::npos || second == first + 1 ||
            second + 1 == line.size() || line.find('\t', second + 1) != std::string::npos) {
            throw std::runtime_error(std::string(path) + ":" + std::to_string(line_number) + ": malformed record");
        }

        if (std::string_view(line).substr(0, first) == suite) {
            const auto scenario = line.substr(first + 1, second - first - 1);
            if (!records.emplace(scenario, line.substr(second + 1)).second) {
                throw std::runtime_error(std::string(path) + ": duplicate scenario " + scenario);
            }
        }
    }
    if (source.bad() || records.empty()) {
        throw std::runtime_error(std::string(path) + ": could not read records for " + std::string(suite));
    }
    return records;
}

std::string difference(const Records& expected, const Records& actual) {
    for (const auto& [scenario, wanted] : expected) {
        const auto found = actual.find(scenario);
        if (found == actual.end()) return scenario + ": missing observation";
        if (found->second == wanted) continue;
        const auto [position, ignored] =
            std::mismatch(wanted.begin(), wanted.end(), found->second.begin(), found->second.end());
        const auto offset = std::to_string(position - wanted.begin());
        return scenario + ": differs at byte " + offset + "\n  expected " + wanted + "\n  observed " + found->second;
    }
    for (const auto& [scenario, _] : actual) {
        if (!expected.contains(scenario)) return scenario + ": unexpected observation";
    }
    return {};
}

void verify_negative_controls(const Records& expected, std::string_view scenario, std::string_view mutation) {
    Records changed = expected;
    const std::string name(scenario);
    auto& observation = changed.at(name);
    if (observation == mutation) throw std::runtime_error(name + ": known-bad observation matches its reference");
    observation = mutation;
    if (!difference(expected, changed).starts_with(name + ": differs")) {
        throw std::runtime_error(name + ": validator failed to reject a changed result");
    }
    changed = expected;
    changed.erase(name);
    if (difference(expected, changed) != name + ": missing observation") {
        throw std::runtime_error(name + ": validator failed to reject a missing result");
    }
    changed = expected;
    changed.emplace("unexpected-fixture-scenario", "{}");
    if (difference(expected, changed) != "unexpected-fixture-scenario: unexpected observation") {
        throw std::runtime_error(name + ": validator failed to reject an extra result");
    }
}

} // namespace

int main(int argc, char* argv[]) {
    if (argc != 6) {
        std::cerr << "usage: contracts CASE EXPECTED OBSERVED MUTATION_SCENARIO MUTATION_JSON\n";
        return 2;
    }
    try {
        const auto expected = read_suite(argv[2], argv[1]);
        const auto observed = read_suite(argv[3], argv[1]);
        verify_negative_controls(expected, argv[4], argv[5]);
        const auto error = difference(expected, observed);
        if (!error.empty()) throw std::runtime_error(error);
        std::cout << argv[1] << ": " << observed.size()
                  << " scenarios matched, and changed/missing/extra observations were rejected\n";
    } catch (const std::exception& error) {
        std::cerr << argv[1] << ": " << error.what() << '\n';
        return 1;
    }
}
