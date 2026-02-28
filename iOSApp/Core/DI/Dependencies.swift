import Foundation

protocol AuthSessionProviding {
    var currentUserID: String? { get }
    var isAuthenticated: Bool { get }
    func refreshSession() async throws
    func signOut() async throws
}

protocol WorkoutRepositoryProviding {
    func fetchRecentWorkouts() async throws -> [WorkoutSummary]
}

protocol SocialRepositoryProviding {
    func fetchFeedPreview() async throws -> [SocialPostPreview]
}

protocol CalendarRepositoryProviding {
    func fetchUpcomingEvents() async throws -> [CalendarEventSummary]
}

protocol ProgressRepositoryProviding {
    func fetchProgressSnapshot() async throws -> ProgressSnapshot
}

protocol ProfileRepositoryProviding {
    func fetchProfile() async throws -> ProfileSummary
}

struct WorkoutSummary: Codable, Equatable, Identifiable, Sendable {
    let id: UUID
    let title: String
    let durationMinutes: Int
}

struct SocialPostPreview: Codable, Equatable, Identifiable, Sendable {
    let id: UUID
    let author: String
    let message: String
}

struct CalendarEventSummary: Codable, Equatable, Identifiable, Sendable {
    let id: UUID
    let title: String
    let date: Date
}

struct ProgressSnapshot: Codable, Equatable, Sendable {
    let streakDays: Int
    let completedWorkouts: Int
}

struct ProfileSummary: Codable, Equatable, Sendable {
    let displayName: String
    let bio: String
}
