import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import Footer from "../components/Footer";
import { Text, Menu, HamburgerIcon } from "native-base";

const AboutPage = ({
  navigation,
  nameOfPage,
  setNameOfPage,
  selected,
  setSelected,
}) => {
  return (
    <View style={styles.containerVersePage}>
      <View style={styles.headerVersePage}>
        <Menu
          trigger={(triggerProps) => {
            return (
              <Pressable
                accessibilityLabel="More options menu"
                {...triggerProps}
              >
                <HamburgerIcon style={{ color: "white" }} />
              </Pressable>
            );
          }}
        >
          <Menu.Item onPress={() => navigation.navigate("AboutPage")}>
            About
          </Menu.Item>
        </Menu>
        {/* <FontAwesomeIcon
            icon={faBars}
            size={22}
            color="white"
            style={styles.hamburgerIcon}
          /> */}
        <Text style={styles.containerKoniortosText}>
          <Text style={styles.firstLetterKoniortos}>K</Text>
          <Text style={styles.letterOfKoniortos}>ONIORTOS</Text>
        </Text>
      </View>

      <Text style={styles.titleBody}>Koniortos v0.1.0</Text>
      <Text style={styles.bodyAboutPage}>
        A React native application https://github.com/Proskomma/koniortos Using
        Proskomma JS for Unfolding Word v0.4.36 © Mark Howe, MIT License
      </Text>

      <View >
        <Footer
          navigation={navigation}
          setNameOfPage={setNameOfPage}
          nameOfPage={nameOfPage}
          selected={selected}
          setSelected={setSelected}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  containerVersePage: {
    minHeight: "100%",
  },
  headerVersePage: {
    width: "100%",
    height: 50,
    backgroundColor: "#415DE2",
    alignItems: "center",
    flexDirection: "row",
    justifyContent:"space-around"

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
  bodyAboutPage: {
    paddingLeft: 12,
    paddingRight: 12,
    paddingBottom: 15,
    fontSize: 16,
  },
  titleBody: { fontWeight: "bold", fontSize: 17, paddingTop: 40 ,    paddingLeft: 12,
  paddingRight: 12,},
});
export default AboutPage;
