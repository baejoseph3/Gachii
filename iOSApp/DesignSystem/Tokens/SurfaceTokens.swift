import SwiftUI

enum SurfaceTokens {
    enum Radius {
        static let sm: CGFloat = 8
        static let md: CGFloat = 12
        static let lg: CGFloat = 16
    }

    enum Shadow {
        static let color = Color.black.opacity(0.12)
        static let radius: CGFloat = 8
        static let x: CGFloat = 0
        static let y: CGFloat = 3
    }

    enum Elevation {
        static let low: CGFloat = 1
        static let medium: CGFloat = 3
        static let high: CGFloat = 6
    }
}
