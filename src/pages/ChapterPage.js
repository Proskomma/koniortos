import React, { useState, useEffect } from "react";
import Footer from "../components/Footer";
import Loading from "../components/Loading";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { Button, Select, Box, Menu, Divider, HamburgerIcon } from "native-base";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faAngleLeft } from "@fortawesome/free-solid-svg-icons";
import { faAngleRight } from "@fortawesome/free-solid-svg-icons";
import { faBars } from "@fortawesome/free-solid-svg-icons";
import PickerTranslations from "../components/PickerTranslations";

const ChapterPage = ({
  chapter,
  books,
  setBook,
  setVerse,
  setChapter,
  navigation,
  pk,
  ndocsLoaded,
  book,
  idOfDocSet,
  setIdOfDocSet,
  setNameOfPage,
  nameOfPage,
  selected,
  setSelected,
}) => {
  const [chapterBlock, setChapterBlock] = useState(1);
  const [queryChapter, setQueryChapter] = useState(1);

  const ChapterView =
    "{\n" +
    '  docSet(id:"%bookId%") {\n' +
    '    document(bookCode: "%book%") {\n' +
    '      title: header(id: "toc2")\n' +
    "      mainSequence {\n" +
    '         blocks(withScriptureCV: "%chapter%") {\n' +
    "            bs { payload }\n" +
    "            items { type subType payload }\n" +
    "         }\n" +
    "      }\n" +
    '      nav: cvNavigation(chapter:"%chapter%" verse: "1") {\n' +
    "        previousChapter\n" +
    "        nextChapter\n" +
    "      }\n" +
    "    }\n" +
    "  }\n" +
    "}";

  useEffect(() => {
    const browseQueryChapter = ChapterView.replace(/%chapter%/g, chapter)
      .replace(/%book%/g, book)
      .replace(/%bookId%/g, idOfDocSet);

    setQueryChapter(browseQueryChapter);
    pk.gqlQuery(browseQueryChapter)
      .then((output) => {
        setChapterBlock(output);
      })
      .catch((err) => console.log(`ERROR: Could not run query: '${err}'`));
  }, [ndocsLoaded, book, idOfDocSet, chapter]);

  const resultChapter =
    chapterBlock.data &&
    chapterBlock.data.docSet.document.mainSequence.blocks.map((b, index) => (
      <Text
        key={index}
        style={
          (styles[b.bs.payload.split("/")[1]],
          books.data.id == "ara_avd" && styles.textDirection)
        }
      >
        {b.items.map((i, index) => {
          if (i.type === "token") {
            return i.payload;
          } else if (i.type === "scope" && i.subType === "start") {
            const scopeParts = i.payload.split("/");
            if (scopeParts[0] === "verses") {
              return (
                <Text
                  key={index}
                  style={styles.numberOfVese}
                  onPress={() => {
                    navigation.navigate("VersePage");
                    setVerse(scopeParts[1]);
                    setNameOfPage("VersePage");
                    setSelected(1);
                  }}
                >
                  &emsp;{scopeParts[1]}&ensp;
                </Text>
              );
            } else {
              return "";
            }
          }
        })}
      </Text>
    ));

  if (!books || !resultChapter) {
    return (
      <View style={styles.containerChapterPage}>
        <View style={{height:"100%"}}>
        <Loading />
        </View>
        </View>
    );
  } else {
    return (
      <View style={styles.containerChapterPage}>
        <View style={styles.headerChapterPage}>
          <Menu
            placement="top right"
            shouldOverlapWithTrigger
            trigger={(triggerProps) => {
              return (
                <Pressable
                style={{ color: "white" }}
                  accessibilityLabel="More options menu"
                  {...triggerProps}
                >
                  <HamburgerIcon  />
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

          <View>
            <PickerTranslations
              idOfDocSet={idOfDocSet}
              setIdOfDocSet={setIdOfDocSet}
              books={books}
            />
          </View>
        </View>

        <View style={styles.containerPagination}>
          <Button
            variant="unstyled"
            isDisabled={!chapterBlock.data.docSet.document.nav.previousChapter}
            onPress={() =>
              setChapter(chapterBlock.data.docSet.document.nav.previousChapter)
            }
          >
            <FontAwesomeIcon
              icon={faAngleLeft}
              size={21}
              color={
                !chapterBlock.data.docSet.document.nav.previousChapter
                  ? "#EBEBE4"
                  : "#DF1919"
              }
            />
          </Button>
          <Select
            selectedValue={book}
            minWidth={150}
            onValueChange={(itemValue) => {
              setBook(itemValue);
              setVerse("1");
              setChapter("1");
            }}
          >
            {books.data.docSets.length > 1 &&
              books.data.docSets
                .filter((item) => item.id === idOfDocSet)[0]
                .documents.map((item) => (
                  <Select.Item
                    key={item.id}
                    label={item.name}
                    value={item.bookCode}
                  />
                ))}
          </Select>
          <Text style={styles.textChap}> {chapter} </Text>

          <Button
            variant="unstyled"
            isDisabled={!chapterBlock.data.docSet.document.nav.nextChapter}
            onPress={() =>
              setChapter(chapterBlock.data.docSet.document.nav.nextChapter)
            }
          >
            <FontAwesomeIcon
              icon={faAngleRight}
              size={21}
              color={
                !chapterBlock.data.docSet.document.nav.nextChapter
                  ? "#EBEBE4"
                  : "#DF1919"
              }
            />
          </Button>
        </View>

        <ScrollView style={styles.contentChapter}>
          <View style={styles.bodyBlocks}>
            {chapterBlock.data && resultChapter}
          </View>
        </ScrollView>

        <View
>
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
  }
};

const styles = StyleSheet.create({
  textChap: {
    fontSize: 15,
    fontWeight: "bold",
  },
  headerChapterPage: {
    width: "100%",
    height: 50,
    backgroundColor: "#415DE2",
    alignItems: "center",
    flexDirection: "row",
    justifyContent:"space-between"
  },
  containerChapterPage: {
    minHeight: "100%",
  },
  containerKoniortosText: {
    textAlign: "center",
    fontWeight: "bold",
    fontFamily: "papyrus",
    letterSpacing: 2,
    margin: "auto",
  },
  containerPagination: {
    alignItems: "center",
    justifyContent: "space-evenly",
    flexDirection: "row",
    width: "100%",
  },
  firstLetterKoniortos: {
    fontSize: 37,
    color: "white",
  },

  letterOfKoniortos: {
    fontSize: 21,
    color: "white",
  },
  contentChapter: {
    marginLeft: 10,
    marginRight: 10,
    marginTop: 10,
    marginBottom: 20,
    height: 50,
  },
  p: {
    textAlign: "justify",
  },
  q: {
    marginLeft: 20,
  },
  bodyBlocks: {
    paddingLeft: 12,
    paddingRight: 12,
    paddingBottom: 10,
  },
  numberOfVese: {
    fontWeight: "bold",
    fontSize: 17,
    color: "#DF1919",
  },
  textDirection: {
    writingDirection: "rtl",
  },
});

export default ChapterPage;
