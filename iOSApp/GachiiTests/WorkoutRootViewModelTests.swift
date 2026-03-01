import XCTest
@testable import GachiiApp

@MainActor
final class WorkoutRootViewModelTests: XCTestCase {
    func testLoadSetsSuccessStateWhenWorkoutsExist() async {
        let repository = MockWorkoutRepository(result: .success([
            WorkoutSummary(id: UUID(), title: "Leg Day", durationMinutes: 52)
        ]))
        let viewModel = WorkoutRootViewModel(repository: repository)

        await viewModel.load()

        guard case .success(let workouts) = viewModel.state else {
            return XCTFail("Expected success state")
        }

        XCTAssertEqual(workouts.count, 1)
        XCTAssertEqual(workouts.first?.title, "Leg Day")
    }

    func testLoadSetsEmptyStateWhenNoWorkoutsExist() async {
        let repository = MockWorkoutRepository(result: .success([]))
        let viewModel = WorkoutRootViewModel(repository: repository)

        await viewModel.load()

        XCTAssertEqual(viewModel.state, .empty)
    }

    func testLoadSetsErrorStateWhenRepositoryFails() async {
        let repository = MockWorkoutRepository(result: .failure(MockError.network))
        let viewModel = WorkoutRootViewModel(repository: repository)

        await viewModel.load()

        guard case .error(let message) = viewModel.state else {
            return XCTFail("Expected error state")
        }

        XCTAssertEqual(message, "We couldn't load workouts right now. Please try again.")
    }
}

private struct MockWorkoutRepository: WorkoutRepositoryProviding {
    let result: Result<[WorkoutSummary], Error>

    func fetchRecentWorkouts() async throws -> [WorkoutSummary] {
        try result.get()
    }
}

private enum MockError: Error {
    case network
}
