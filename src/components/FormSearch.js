import React from "react";
import { View, StyleSheet, Text } from "react-native";
import { Input, Button } from "native-base";
const FormSearch = ({ isLoading, setIsLoading, setTemporaryInput, temporaryInput, listOfBooks, setInputSearch, setBooksToSearch, setSearchResults, indexOfFirstBlock, indexOfLastBlock, setCurrentPage, setBlocksPerPage, setSearchResult   }) => {

  const handlePress = () => {
    if (temporaryInput.length > 0) {
      setIsLoading(true)
      setInputSearch(temporaryInput);
      setBooksToSearch(listOfBooks);
      setSearchResults([]);
      setSearchResult(null);
      indexOfFirstBlock = 0;
      indexOfLastBlock = 0;
      setCurrentPage(1);
      setBlocksPerPage(10);
    }
  };
  
  
  return (
    <View style={styles.containerForm}>
      <Input 
        InputRightElement={
          <Button
          isDisabled={isLoading}
          onPress={handlePress}
          ml={1} roundedLeft={0} roundedRight="md"
          style={styles.buttonSearchContainer}
          small
          bordered
        >
          <Text style={styles.textButtonSearch}> SEARCH</Text>
        </Button>
        }
        placeholderTextColor="#9D9D9D"
        placeholder="Search"
        value={temporaryInput}
        onChangeText={setTemporaryInput}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  containerForm: {
    width: "100%",
    paddingTop: 15,
    paddingRight:30,
    paddingLeft:30,
  },
  buttonSearchContainer:{
    backgroundColor:"#DF1919"
  },
  textButtonSearch : {
    color:"white",
    textAlign:"center"
  },
});

export default FormSearch;
