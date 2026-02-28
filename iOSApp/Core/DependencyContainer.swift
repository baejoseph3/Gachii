import Foundation

@Observable
final class DependencyContainer {
    var uuid: () -> UUID

    init(uuid: @escaping () -> UUID) {
        self.uuid = uuid
    }

    @MainActor static let live = DependencyContainer(uuid: UUID.init)
}
