import { mount, signal, Text, View } from "nsh";
import { createNavStack, NavPage, NavStack } from "nsh/base";

// A pushed page's header item whose content changes size while the page comes
// in or later, as a progress pill does when its numbers arrive.
function App() {
  const nav = createNavStack<string>(["root"]);
  const pill = signal("");
  const presses = signal(0);
  const pushThen = (...steps: string[]) => {
    nav.push("page");
    steps.forEach((step, i) => setTimeout(() => pill.set(step), 50 + i * 100));
  };
  return (
    <View style={{ flex: 1, paddingTop: 64, backgroundColor: "#ffffff" }}>
      <Text>{`presses:${presses()}`}</Text>
      <View style={{ flexDirection: "row", gap: 16 }}>
        <View testID="push" role="button" onPress={() => pushThen()} style={{ height: 40 }}><Text>Push</Text></View>
        <View testID="push-grow" role="button" onPress={() => pushThen("2/3 48%")} style={{ height: 40 }}><Text>Grow</Text></View>
        <View testID="push-grow-shrink" role="button" onPress={() => pushThen("2/3 48%", "3%")} style={{ height: 40 }}><Text>Shrink</Text></View>
        <View testID="later" role="button" onPress={() => pill.set("2/3 48%")} style={{ height: 40 }}><Text>Later</Text></View>
      </View>
      <NavStack state={nav} style={{ flex: 1 }}>
        {(route) => (
          <NavPage
            title={route === "root" ? "Root" : "Ok"}
            headerVisible
            headerRight={route === "root" ? undefined : (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text testID="pill" style={{ fontSize: 13 }}>{pill()}</Text>
                <View testID="more" role="button" onPress={() => presses.update((n) => n + 1)}
                  style={{ width: 36, height: 36, backgroundColor: "#cc0000" }} />
              </View>
            )}
          >
            <View style={{ flex: 1, backgroundColor: "#ffffff" }} />
          </NavPage>
        )}
      </NavStack>
    </View>
  );
}

mount(App);
