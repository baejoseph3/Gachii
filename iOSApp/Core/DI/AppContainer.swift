import Foundation
import Observation

@Observable
final class AppContainer {
    let authSession: AuthSessionProviding
    let workoutRepository: WorkoutRepositoryProviding
    let socialRepository: SocialRepositoryProviding
    let calendarRepository: CalendarRepositoryProviding
    let progressRepository: ProgressRepositoryProviding
    let profileRepository: ProfileRepositoryProviding

    init(
        authSession: AuthSessionProviding,
        workoutRepository: WorkoutRepositoryProviding,
        socialRepository: SocialRepositoryProviding,
        calendarRepository: CalendarRepositoryProviding,
        progressRepository: ProgressRepositoryProviding,
        profileRepository: ProfileRepositoryProviding
    ) {
        self.authSession = authSession
        self.workoutRepository = workoutRepository
        self.socialRepository = socialRepository
        self.calendarRepository = calendarRepository
        self.progressRepository = progressRepository
        self.profileRepository = profileRepository
    }

    @MainActor static let live = AppContainer(
        authSession: InMemoryAuthSession(),
        workoutRepository: StubWorkoutRepository(),
        socialRepository: StubSocialRepository(),
        calendarRepository: StubCalendarRepository(),
        progressRepository: StubProgressRepository(),
        profileRepository: StubProfileRepository()
    )
}

final class InMemoryAuthSession: AuthSessionProviding {
    private var userID: String? = "demo-user"

    var currentUserID: String? { userID }
    var isAuthenticated: Bool { userID != nil }

    func refreshSession() async throws {
        // Placeholder for token refresh flow.
    }

    func signOut() async throws {
        userID = nil
    }
}

struct StubWorkoutRepository: WorkoutRepositoryProviding {
    func fetchRecentWorkouts() async throws -> [WorkoutSummary] {
        [WorkoutSummary(id: UUID(), title: "Full Body Strength", durationMinutes: 45)]
    }
}

struct StubSocialRepository: SocialRepositoryProviding {
    func fetchFeedPreview() async throws -> [SocialPostPreview] {
        [SocialPostPreview(id: UUID(), author: "Gachii Coach", message: "Welcome to your social feed.")]
    }
}

struct StubCalendarRepository: CalendarRepositoryProviding {
    func fetchUpcomingEvents() async throws -> [CalendarEventSummary] {
        [CalendarEventSummary(id: UUID(), title: "Mobility Session", date: .now.addingTimeInterval(86_400))]
    }
}

struct StubProgressRepository: ProgressRepositoryProviding {
    func fetchProgressSnapshot() async throws -> ProgressSnapshot {
        ProgressSnapshot(streakDays: 4, completedWorkouts: 12)
    }
}

struct StubProfileRepository: ProfileRepositoryProviding {
    func fetchProfile() async throws -> ProfileSummary {
        ProfileSummary(displayName: "Athlete", bio: "Ready for the next session.")
    }
}
