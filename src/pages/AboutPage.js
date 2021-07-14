import React from "react";
import { View, StyleSheet, Pressable, ScrollView } from "react-native";
import Footer from "../components/Footer";
import { Text, Menu, HamburgerIcon } from "native-base";
import PickerTranslations from "../components/PickerTranslations";

const AboutPage = ({
  navigation,
  nameOfPage,
  setNameOfPage,
  selected,
  setSelected,
  idOfDocSet,
  setIdOfDocSet,
  books
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
        <View>
            <PickerTranslations
              idOfDocSet={idOfDocSet}
              setIdOfDocSet={setIdOfDocSet}
              books={books}
            />
          </View>
      </View>
      <ScrollView style={styles.bodyAboutPage}>
      <Text style={styles.titleBody}>Koniortos v0.1.0</Text>
      <Text style={styles.bodyAboutPage}>
        A React native application       </Text>

        <Text style={styles.bodyAboutPage}>Using
        Proskomma JS for Unfolding Word v0.4.36</Text>
        <Text style={styles.bodyAboutPage}>https://github.com/Proskomma/koniortos </Text>
        <Text style={styles.bodyAboutPage}>by Imad HAMZI © MVH Solutions
</Text>
<Text style={styles.bodyAboutPage}>MIT License</Text>
      </ScrollView>

 

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
    justifyContent:"space-between"

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

    paddingBottom: 15,
    fontSize: 16,
  },
  bodyAboutPage:{
    height:50,
    paddingLeft: 12,
    paddingRight: 12,
  },
  titleBody: { fontWeight: "bold", fontSize: 17, paddingTop: 40 ,    paddingLeft: 12,
  paddingRight: 12,paddingBottom:12},
});
export default AboutPage;
