import SwiftUI

enum ColorTokens {
    enum Surface {
        static let canvas = Color(uiColor: .systemBackground)
        static let primary = Color(uiColor: .secondarySystemBackground)
        static let elevated = Color(uiColor: .tertiarySystemBackground)
    }

    enum Text {
        static let primary = Color(uiColor: .label)
        static let secondary = Color(uiColor: .secondaryLabel)
        static let inverse = Color(uiColor: .systemBackground)
    }

    enum Brand {
        static let primary = Color.accentColor
        static let secondary = Color(uiColor: .systemIndigo)
    }

    enum Status {
        static let success = Color(uiColor: .systemGreen)
        static let warning = Color(uiColor: .systemOrange)
        static let error = Color(uiColor: .systemRed)
        static let info = Color(uiColor: .systemBlue)
    }
}
