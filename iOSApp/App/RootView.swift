import SwiftUI

enum AppTab: Hashable {
    case workout
    case social
    case calendar
    case progress
    case profile
}

enum WorkoutRoute: Hashable {
    case workoutDetail
}

enum SocialRoute: Hashable {
    case postDetail
}

enum CalendarRoute: Hashable {
    case eventDetail
}

enum ProgressRoute: Hashable {
    case achievements
}

enum ProfileRoute: Hashable {
    case account
}

struct RootShellView: View {
    let container: AppContainer

    @State private var selectedTab: AppTab = .workout
    @State private var workoutPath: [WorkoutRoute] = []
    @State private var socialPath: [SocialRoute] = []
    @State private var calendarPath: [CalendarRoute] = []
    @State private var progressPath: [ProgressRoute] = []
    @State private var profilePath: [ProfileRoute] = []

    var body: some View {
        TabView(selection: $selectedTab) {
            workoutTab
            socialTab
            calendarTab
            progressTab
            profileTab
        }
    }

    private var workoutTab: some View {
        NavigationStack(path: $workoutPath) {
            WorkoutRootView(container: container)
                .navigationDestination(for: WorkoutRoute.self) { route in
                    switch route {
                    case .workoutDetail:
                        Text("Workout details placeholder")
                    }
                }
        }
        .tabItem { Label("Workout", systemImage: "dumbbell") }
        .tag(AppTab.workout)
    }

    private var socialTab: some View {
        NavigationStack(path: $socialPath) {
            SocialRootView(container: container)
                .navigationDestination(for: SocialRoute.self) { route in
                    switch route {
                    case .postDetail:
                        Text("Post details placeholder")
                    }
                }
        }
        .tabItem { Label("Social", systemImage: "person.2") }
        .tag(AppTab.social)
    }

    private var calendarTab: some View {
        NavigationStack(path: $calendarPath) {
            CalendarRootView(container: container)
                .navigationDestination(for: CalendarRoute.self) { route in
                    switch route {
                    case .eventDetail:
                        Text("Event details placeholder")
                    }
                }
        }
        .tabItem { Label("Calendar", systemImage: "calendar") }
        .tag(AppTab.calendar)
    }

    private var progressTab: some View {
        NavigationStack(path: $progressPath) {
            ProgressRootView(container: container)
                .navigationDestination(for: ProgressRoute.self) { route in
                    switch route {
                    case .achievements:
                        Text("Achievements placeholder")
                    }
                }
        }
        .tabItem { Label("Progress", systemImage: "chart.line.uptrend.xyaxis") }
        .tag(AppTab.progress)
    }

    private var profileTab: some View {
        NavigationStack(path: $profilePath) {
            ProfileRootView(container: container)
                .navigationDestination(for: ProfileRoute.self) { route in
                    switch route {
                    case .account:
                        Text("Account placeholder")
                    }
                }
        }
        .tabItem { Label("Profile", systemImage: "person.crop.circle") }
        .tag(AppTab.profile)
    }
}

#Preview {
    RootShellView(container: .live)
        .environment(AppContainer.live)
}
