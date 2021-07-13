import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, ScrollView, Pressable, RefreshControl } from "react-native";
import {
  Text,
  Select,
  Box,
  Menu,
  Divider,
  Button,
  HamburgerIcon,
} from "native-base";import Footer from "../components/Footer";
import FormSearch from "../components/FormSearch";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faAngleLeft } from "@fortawesome/free-solid-svg-icons";
import { faAngleRight } from "@fortawesome/free-solid-svg-icons";
import { faBars } from "@fortawesome/free-solid-svg-icons";
import PickerTranslations from "../components/PickerTranslations";

const SearchPage = ({
  navigation,
  idOfDocSet,
  setIdOfDocSet,
  books,
  pk,
  setNameOfPage,
  nameOfPage,
  setVerse,
  setChapter,
  setBook,
  selected,
  setSelected,
}) => {
  const [inputSearch, setInputSearch] = useState("");
  const [temporaryInput, setTemporaryInput] = useState("");
  const [querySearch, setQuerySearch] = useState(1);
  const [booksToSearch, setBooksToSearch] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchResult, setSearchResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const scrollRef = useRef();

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({
      y: 0,
      animated : true,
    })
  }




  //Pagination
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(11);
  const [currentPage, setCurrentPage] = useState(1);
  const [blocksPerPage, setBlocksPerPage] = useState(10);
  let indexOfLastBlock = currentPage * blocksPerPage;
  let indexOfFirstBlock = indexOfLastBlock - blocksPerPage;
  const pageNumbers = [];
  for (let i = 1; i <= Math.ceil(searchResults.length / blocksPerPage); i++) {
    pageNumbers.push(i);
  }

  const listOfBooks = books.data.docSets
    .filter((item) => item.id === idOfDocSet)[0]
    .documents.map((item) => item.bookCode);

  const queryTemplateSearch =
    "{" +
    '  docSet(id:"%docSetId%") {\n' +
    "    document(" +
    '        bookCode:"%bookCode%" \n' +
    "      ) {\n" +
    "       id\n" +
    '       bookCode: header(id: "bookCode")\n' +
    '       title: header(id: "toc2")\n' +
    "       mainSequence {\n" +
    "         blocks(\n" +
    '            allChars : true ' + 
    '           withMatchingChars: [%searchTerms%]\n' +
    "         ) {\n" +
    "           scopeLabels tokens { payload }\n" +
    "           items { type subType payload }\n" +
    "         }\n" +
    "       }\n" +
    "    }\n" +
    '    matches: enumRegexIndexesForString (enumType:"wordLike" searchRegex:"%searchTermsRegex%") { matched }\n' +
    "  }\n" +
    "}";

  useEffect(() => {
    if (searchResult ) {

      const document = searchResult.data.docSet.document;
      const matchableWords =
        searchResult &&
        searchResult.data.docSet.matches.map((mt) => mt.matched);

      const records = document.mainSequence.blocks.map((bl) => {
        const verses = bl.scopeLabels
          .filter((sl) => sl.startsWith("verse/"))
          .map((sl) => sl.split("/")[1]);

        return {
          docId: document.id,
          bookCode: document.bookCode,
          toc2: document.title,
          chapter: bl.scopeLabels
            .filter((sl) => sl.startsWith("chapter"))
            .map((sl) => sl.split("/")[1])[0],
          verses: `${verses[0]}${
            verses.length > 1 ? "-" + verses[verses.length - 1] : ""
          }`,
          words: bl.items.map((i, index) => {
            if (i.type === "token") {
              if (matchableWords.includes(i.payload)) {
                return (
                  <Text key={index} style={styles.matchableWord}>
                    {i.payload}
                  </Text>
                );
              } else {
                return i.payload;
              }
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
                      setChapter(
                        bl.scopeLabels
                          .filter((sl) => sl.startsWith("chapter"))
                          .map((sl) => sl.split("/")[1])[0]
                      );
                      setNameOfPage("VersePage");
                      setBook(document.bookCode);
                    }}
                  >
                    &emsp;{scopeParts[1]}&ensp;
                  </Text>
                );
              } else {
                return "";
              }
            }
          }),
        };
      });

      setSearchResults([...searchResults, ...records]);
    }
  }, [searchResult]);

  useEffect(() => {
    if (booksToSearch.length > 0) {
      const bookSearchforQuery = booksToSearch[0];

      const searchTermsArray = inputSearch
        .split(/ +/).map((st) => st.trim()).filter(st => st.length > 0);

      if (searchTermsArray.length > 0) {
        const browseQuerySearch = queryTemplateSearch
          .replace(/%docSetId%/g, idOfDocSet)
          .replace(/%bookCode%/g, bookSearchforQuery)
          .replace(/%searchTerms%/g, searchTermsArray.map((st) => `"^${st}$"`).join(', '))
          .replace(
            /%searchTermsRegex%/g,
            searchTermsArray.map((st) => `(^${st}$)`).join("|")
          )

        setQuerySearch(browseQuerySearch);
        const doQuery = async () => {
          const output = await pk.gqlQuery(browseQuerySearch);
          setBooksToSearch(booksToSearch.slice(1));
          setSearchResult(output);
        };
        doQuery();
      }
    } else {
      setIsLoading(false)
    }
  }, [booksToSearch, searchResults]);



  return (
    <Box style={styles.containerSearchPage}>
      <View style={styles.headerSearchPage}>
      <Menu
              placement="top right"
              shouldOverlapWithTrigger
          trigger={(triggerProps) => {
            return (
              <Pressable
                accessibilityLabel="More options menu"
                {...triggerProps}
              >
                <HamburgerIcon  style={{color:"white"}}
/>
              </Pressable>
            );
          }}
        >
          <Menu.Item onPress={() =>  navigation.navigate("AboutPage")
}>About</Menu.Item>

        </Menu>
        <Text
          style={styles.containerKoniortosText}
        >
          <Text style={styles.firstLetterKoniortos}>K</Text>
          <Text style={styles.letterOfKoniortos}>ONIORTOS</Text>
        </Text>

        <PickerTranslations
          idOfDocSet={idOfDocSet}
          setIdOfDocSet={setIdOfDocSet}
          books={books}
        />
      </View>

      <FormSearch
      isLoading={isLoading}
      setIsLoading={setIsLoading}
        setInputSearch={setInputSearch}
        setBooksToSearch={setBooksToSearch}
        setSearchResults={setSearchResults}
        indexOfFirstBlock={indexOfFirstBlock}
        indexOfLastBlock={indexOfLastBlock}
        setCurrentPage={setCurrentPage}
        setBlocksPerPage={setBlocksPerPage}
        inputSearch={inputSearch}
        setInputSearch={setInputSearch}
        temporaryInput={temporaryInput}
        setTemporaryInput={setTemporaryInput}
        listOfBooks={listOfBooks}
        setSearchResult={setSearchResult}
      />{" "}
      {searchResults.length > 0 ? (
        <>
          <View style={styles.paginationSearch}>
            <Button
              variant="unstyled"
              isDisabled={currentPage === 1}
              onPress={() => {
                setCurrentPage(currentPage - 1);
              }}
            >
              <FontAwesomeIcon
                icon={faAngleLeft}
                size={21}
                color={currentPage === 1 ? "#EBEBE4" : "#DF1919"}
              />
            </Button>

            <Text style={styles.textInfoPagination}>
              {listOfBooks.length - booksToSearch.length}/{listOfBooks.length}{" "}
              books , showing {indexOfFirstBlock} to{" "}
              {Math.min(indexOfLastBlock, searchResults.length)} of{" "}
              {searchResults.length} {searchResults.length == 1 ? "result" : "results"}
            </Text>

            <Button
              variant="unstyled"
              isDisabled={currentPage >= pageNumbers.length}
              onPress={() => {
                setCurrentPage(currentPage + 1);
              }}
            >
              <FontAwesomeIcon
                icon={faAngleRight}
                size={21}
                color={
                  currentPage >= pageNumbers.length ? "#EBEBE4" : "#DF1919"
                }
              />
            </Button>
          </View>

          <ScrollView style={styles.bodySearchPage} ref={scrollRef}>
            <Box style={books.data.id == "ara_avd" && styles.textDirection}>
              {searchResults
                .slice(indexOfFirstBlock, indexOfLastBlock)
                .map((bl, indexBl) => (
                  <>
                    <View style={styles.containerSearchResults}  key={indexBl}>
                      <Text style={isLoading ? styles.textNoMatchesLoading : styles.textNoMatches} style={styles.titleBookChapVerse} key={indexBl+"_1"}>
                        {bl.bookCode} {bl.chapter} : {bl.verses} {"\n"}
                      </Text>
                      <Text style={isLoading ? styles.textNoMatchesLoading : styles.textNoMatches} style={styles.textBodySearch} key={indexBl+"_2"}>
                        {bl.words} {"\n"}
                      </Text>
                    </View>
                  </>
                ))}
            </Box>

            <Box 
              style={styles.bottomPaginaton}
            >
              <Button
                variant="unstyled"
                isDisabled={currentPage === 1}
                onPress={() => {
                  setCurrentPage(currentPage - 1);
                  scrollToTop();
                }}
              >
                <FontAwesomeIcon
                  icon={faAngleLeft}
                  size={21}
                  color={currentPage === 1 ? "#EBEBE4" : "#DF1919"}
                />
              </Button>
              <Text style={{ fontWeight: "bold" }}>
                {currentPage} of {pageNumbers.length} {pageNumbers.length == 1 ? "page" : "pages"}
              </Text>
              <Button
                variant="unstyled"
                isDisabled={currentPage >= pageNumbers.length}
                onPress={() => {
                  scrollToTop();
                  setCurrentPage(currentPage + 1);
                }}
              >
                <FontAwesomeIcon
                  icon={faAngleRight}
                  size={21}
                  color={
                    currentPage >= pageNumbers.length ? "#EBEBE4" : "#DF1919"
                  }
                />
              </Button>
            </Box>
          </ScrollView>
        </>
      ) : ( 
                <View style={styles.containerPage}>
                <Text style={isLoading ? styles.textNoMatchesLoading : styles.textNoMatches}>
                No matches - type search terms above, then click 'Search' 
                </Text>
              </View> 
      )}
        <View >
        <Footer
          navigation={navigation}
          setNameOfPage={setNameOfPage}
          nameOfPage={nameOfPage}
          selected={selected}
          setSelected={setSelected}
        />
      </View></Box>
  );
};
const styles = StyleSheet.create({
  containerSearchPage: { 
    minHeight: "100%",
  },
  headerSearchPage : {
    width: "100%",
    height: 50,
    backgroundColor: "#415DE2",
    alignItems: "center",
    flexDirection: "row",
    justifyContent:"space-around"

  },
  hamburgerIcon: { 
    marginLeft: 5,
     paddingRight: 40 
    },
  containerKoniortosText : {
    textAlign: "center",
    fontWeight: "bold",
    fontFamily: "papyrus",
    letterSpacing: 2,
    margin: "auto",
  },
  firstLetterKoniortos: { 
    fontSize: 37,
     color: "white" 
    },
  containerPage: {
    flex: 1,
    alignItems: "center",
  },
  letterOfKoniortos: { 
    fontSize: 21, 
    color: "white" 
  },
  numberOfVese: {
    fontWeight: "bold",
    fontSize: 17,
    color: "#DF1919",
  },
  bottomPaginaton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  bodySearchPage: {
    paddingLeft: 12,
    paddingRight: 12,
    marginBottom: 12,
    marginBottom: 20,
    height:50

  },
  titleBookChapVerse: {
    fontWeight: "bold",
    fontStyle: "italic",
    paddingBottom: 4,
    fontSize: 15,
  },
  textBodySearch: {
    textAlign: "justify",
    fontSize: 14,
  },
  containerSearchResults: {
    marginBottom: 12,
  },
  textDirection: {
    writingDirection: "rtl",
  },
  paginationSearch: {
    alignItems: "center",
    justifyContent: "space-evenly",
    flexDirection: "row",
    width: "100%",
    marginBottom: 10,
  },
  matchableWord: {
    fontWeight: "bold",
    fontSize: 14,
  },
  textInfoPagination: { 
    fontWeight: "bold",
     fontSize: 13,
      textAlign: "center" 
    },
  textNoMatches: {
    paddingLeft: 12,
    paddingRight: 12,
    paddingTop: 20,
    textAlign:"center"
  },
  textNoMatchesLoading: {
    paddingLeft: 12,
    paddingRight: 12,
    paddingTop: 20,
    color:"#DADADA",
    textAlign:"center"
  },
});

export default SearchPage;
