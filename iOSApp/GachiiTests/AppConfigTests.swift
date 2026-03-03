import XCTest
@testable import GachiiApp

final class AppConfigTests: XCTestCase {
    func testBuildsStagingConfigFromEnvironmentValues() throws {
        let values: [String: String] = [
            "GACHII_ENV": "staging",
            "SUPABASE_URL_STAGING": "https://staging-project.supabase.co",
            "SUPABASE_ANON_KEY_STAGING": "staging-anon-key"
        ]

        let config = try AppConfig(values: values)

        XCTAssertEqual(config.environment, .staging)
        XCTAssertEqual(config.supabase.url.absoluteString, "https://staging-project.supabase.co")
        XCTAssertEqual(config.supabase.anonKey, "staging-anon-key")
    }

    func testThrowsForUnknownEnvironment() {
        let values = ["GACHII_ENV": "qa"]

        XCTAssertThrowsError(try AppConfig(values: values)) { error in
            XCTAssertEqual(error as? AppConfigurationError, .invalidEnvironment("qa"))
        }
    }

    func testAPIErrorMapperMapsConfigurationError() {
        let mapped = APIErrorMapper.map(AppConfigurationError.missingValue(key: "SUPABASE_URL_DEVELOPMENT"))
        XCTAssertEqual(mapped, .configuration)
    }
}
