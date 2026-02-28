import SwiftUI

struct WorkoutRootView: View {
    let container: AppContainer

    var body: some View {
        List {
            Section("Workout") {
                Text("Recent workouts and plans will appear here.")
                Text(container.authSession.isAuthenticated ? "Signed in" : "Signed out")
                    .foregroundStyle(.secondary)
            }
        }
        .navigationTitle("Workout")
    }
}

#Preview {
    NavigationStack {
        WorkoutRootView(container: .live)
    }
}
