import React from "react";

import {
  HStack,
  Center,
  Pressable,
  Text,
} from "native-base";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faFileAlt } from "@fortawesome/free-solid-svg-icons";
import { faSearch } from "@fortawesome/free-solid-svg-icons";
import { faBookOpen } from "@fortawesome/free-solid-svg-icons";

export default function Footer({
  navigation,
  nameOfPage,
  setNameOfPage,
  selected,
  setSelected,
}) {
  const navigationVersePage = () => {
    setSelected(1);
    navigation.navigate("VersePage");
    setNameOfPage("VersePage");
  };
  const navigationChapterPage = () => {
    setSelected(2);
    navigation.navigate("ChapterPage");
    setNameOfPage("ChapterPage");
  };
  const navigationSearchPage = () => {
    setSelected(3);
    navigation.navigate("SearchPage");
    setNameOfPage("SearchPage");
  };
  return (
    <>
      <HStack bg="#415DE2" alignItems="center" safeAreaBottom shadow={6} >
        <Pressable
          opacity={selected === 1 ? 1 : 0.5}
          py={2}
          flex={1}
          onPress={navigationVersePage}
        >
          <Center>
            <FontAwesomeIcon icon={faFileAlt} color="white" size={18} />

            <Text bold fontSize={12} color="white" style={{paddingTop:3}}>
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

            <Text bold fontSize={12} color="white" style={{paddingTop:3}}>
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

            <Text bold fontSize={12} color="white" style={{paddingTop:3}}>
              Search
            </Text>
          </Center>
        </Pressable>
      </HStack>
    </>
  );
}
