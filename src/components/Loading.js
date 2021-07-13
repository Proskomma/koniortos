import React from "react";
import { StyleSheet } from "react-native";
import { Spinner, Heading, Center } from "native-base";

const Loading = () => {
  return (
    <>
      <Center>
        <Spinner color="red" />
        <Heading>Loading...</Heading>
      </Center>
    </>
  );
};

const styles = StyleSheet.create({

});

export default Loading;
