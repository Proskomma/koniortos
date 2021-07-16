import React from "react";
import { HStack, Center, Pressable, Text } from "native-base";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faFileAlt } from "@fortawesome/free-solid-svg-icons";
import { faSearch } from "@fortawesome/free-solid-svg-icons";
import { faBookOpen } from "@fortawesome/free-solid-svg-icons";
import { StyleSheet } from "react-native";

const Footer = ({ navigation, selected, setSelected }) => {

  const navigationVersePage = () => {
    setSelected(1);
    navigation.navigate("VersePage");
  };
  const navigationChapterPage = () => {
    setSelected(2);
    navigation.navigate("ChapterPage");
  };
  const navigationSearchPage = () => {
    setSelected(3);
    navigation.navigate("SearchPage");
  };

  return (
    <>
      <HStack bg="#415DE2" alignItems="center" safeAreaBottom shadow={6}>
        <Pressable
          opacity={selected === 1 ? 1 : 0.5}
          py={2}
          flex={1}
          onPress={navigationVersePage}
        >
          <Center>
            <FontAwesomeIcon icon={faFileAlt} color="white" size={18} />
            <Text bold fontSize={12} color="white" style={styles.textFooter}>
              Verses
            </Text>
          </Center>
        </Pressable>
        <Pressable
          opacity={selected === 2 ? 1 : 0.5}
          py={2}
          flex={1}
          onPress={navigationChapterPage}
        >
          <Center>
            <FontAwesomeIcon icon={faBookOpen} color="white" size={18} />
            <Text bold fontSize={12} color="white" style={styles.textFooter}>
              Chapters
            </Text>
          </Center>
        </Pressable>
        <Pressable
          onPress={navigationSearchPage}
          opacity={selected === 3 ? 1 : 0.5}
          py={2}
          flex={1}
        >
          <Center>
            <FontAwesomeIcon icon={faSearch} color="white" size={18} />
            <Text bold fontSize={12} color="white" style={styles.textFooter}>
              Search
            </Text>
          </Center>
        </Pressable>
      </HStack>
    </>
  );
}

const styles = StyleSheet.create({
  textFooter: {
    paddingTop: 3,
  },
});


export default Footer;