import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Text, Menu, HamburgerIcon } from "native-base";
import PickerTranslations from "./PickerTranslations";

export default function Header(idOfDocSet, setIdOfDocSet, books, navigation) {
  return (
    <View style={styles.headerSearchPage}>
      <Menu
        placement="top right"
        shouldOverlapWithTrigger
        trigger={(triggerProps) => {
          return (
            <Pressable accessibilityLabel="More options menu" {...triggerProps}>
              <HamburgerIcon style={{ color: "white" }} />
            </Pressable>
          );
        }}
      >
        <Menu.Item onPress={() => navigation.navigate("AboutPage")}>
          About
        </Menu.Item>
      </Menu>
      
      <Text style={styles.containerKoniortosText}>
        <Text style={styles.firstLetterKoniortos}>K</Text>
        <Text style={styles.letterOfKoniortos}>ONIORTOS</Text>
      </Text>

      <PickerTranslations
        idOfDocSet={idOfDocSet}
        setIdOfDocSet={setIdOfDocSet}
        books={books}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerSearchPage: {
    width: "100%",
    height: 50,
    backgroundColor: "#415DE2",
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  containerKoniortosText: {
    textAlign: "center",
    fontWeight: "bold",
    fontFamily: "papyrus",
    letterSpacing: 2,
    margin: "auto",
  },
  firstLetterKoniortos: {
    fontSize: 37,
    color: "white",
  },
  letterOfKoniortos: {
    fontSize: 21,
    color: "white",
  },
});
