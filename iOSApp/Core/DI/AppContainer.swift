import Foundation
import Observation

@Observable
final class AppContainer {
    let appConfig: AppConfigProviding
    let supabaseClient: SupabaseClientProviding
    let authSession: AuthSessionProviding
    let workoutRepository: WorkoutRepositoryProviding
    let socialRepository: SocialRepositoryProviding
    let calendarRepository: CalendarRepositoryProviding
    let progressRepository: ProgressRepositoryProviding
    let profileRepository: ProfileRepositoryProviding

    init(
        appConfig: AppConfigProviding,
        supabaseClient: SupabaseClientProviding,
        authSession: AuthSessionProviding,
        workoutRepository: WorkoutRepositoryProviding,
        socialRepository: SocialRepositoryProviding,
        calendarRepository: CalendarRepositoryProviding,
        progressRepository: ProgressRepositoryProviding,
        profileRepository: ProfileRepositoryProviding
    ) {
        self.appConfig = appConfig
        self.supabaseClient = supabaseClient
        self.authSession = authSession
        self.workoutRepository = workoutRepository
        self.socialRepository = socialRepository
        self.calendarRepository = calendarRepository
        self.progressRepository = progressRepository
        self.profileRepository = profileRepository
    }

    @MainActor static let live: AppContainer = {
        let config = try? AppConfig.fromProcessInfo()
        let resolvedConfig = config ?? AppConfig(
            environment: .development,
            supabase: SupabaseConfiguration(
                url: URL(string: "https://invalid.local")!,
                anonKey: ""
            )
        )
        let client: SupabaseClientProviding
        if let config {
            let transport = URLSessionSupabaseTransport(config: config.supabase)
            client = SupabaseClient(transport: transport)
        } else {
            client = UnconfiguredSupabaseClient()
        }
        let authSession = AuthSessionManager(
            tokenStore: KeychainSessionTokenStore(),
            authService: StubSupabaseAuthService()
        )

        return AppContainer(
            appConfig: resolvedConfig,
            supabaseClient: client,
            authSession: authSession,
            workoutRepository: StubWorkoutRepository(),
            socialRepository: StubSocialRepository(),
            calendarRepository: StubCalendarRepository(),
            progressRepository: StubProgressRepository(),
            profileRepository: StubProfileRepository()
        )
    }()
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
