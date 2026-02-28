import SwiftUI

struct CalendarRootView: View {
    let container: AppContainer

    var body: some View {
        ContentUnavailableView(
            "Calendar",
            systemImage: "calendar",
            description: Text("Training schedule placeholder.")
        )
        .navigationTitle("Calendar")
    }
}

#Preview {
    NavigationStack {
        CalendarRootView(container: .live)
    }
}
