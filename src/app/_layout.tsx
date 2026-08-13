import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false, // Completely removes header / top navigation bar
        contentStyle: { backgroundColor: "#090A0F" },
      }}
    />
  );
}
