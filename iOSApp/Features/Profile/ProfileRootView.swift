import SwiftUI

struct ProfileRootView: View {
    let container: AppContainer

    var body: some View {
        ContentUnavailableView(
            "Profile",
            systemImage: "person.crop.circle",
            description: Text("Account settings placeholder.")
        )
        .navigationTitle("Profile")
    }
}

#Preview {
    NavigationStack {
        ProfileRootView(container: .live)
    }
}
