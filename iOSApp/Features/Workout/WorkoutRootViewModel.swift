import Foundation
import Observation

enum WorkoutRootState: Equatable {
    case loading
    case empty
    case success([WorkoutSummary])
    case error(message: String)
}

@MainActor
@Observable
final class WorkoutRootViewModel {
    private let repository: WorkoutRepositoryProviding

    private(set) var state: WorkoutRootState = .loading

    init(repository: WorkoutRepositoryProviding) {
        self.repository = repository
    }

    func load() async {
        state = .loading

        do {
            let workouts = try await repository.fetchRecentWorkouts()
            state = workouts.isEmpty ? .empty : .success(workouts)
        } catch {
            state = .error(message: "We couldn't load workouts right now. Please try again.")
        }
    }

    func retry() async {
        await load()
    }
}
