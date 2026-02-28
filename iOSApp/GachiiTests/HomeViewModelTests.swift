import XCTest
@testable import GachiiApp

@MainActor
final class HomeViewModelTests: XCTestCase {
    func testLoadSetsSuccessState() async {
        let viewModel = HomeViewModel()

        await viewModel.load()

        XCTAssertEqual(viewModel.state, .success(title: "Welcome to Gachii iOS"))
    }
}
