// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "BlueCortexCapacitorPowersyncSupabase",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "BlueCortexCapacitorPowersyncSupabase",
            targets: ["BlueCortexCapacitorPowersyncSupabasePlugin"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.0.0"),
        .package(url: "https://github.com/powersync-ja/powersync-swift.git", from: "1.0.0"),
        .package(url: "https://github.com/supabase/supabase-swift.git", from: "2.0.0")
    ],
    targets: [
        .target(
            name: "BlueCortexCapacitorPowersyncSupabasePlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                .product(name: "PowerSync", package: "powersync-swift"),
                .product(name: "Supabase", package: "supabase-swift")
            ],
            path: "ios/Sources/BlueCortexCapacitorPowersyncSupabasePlugin")
    ]
)
