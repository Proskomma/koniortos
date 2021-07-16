import React from "react";
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


export default Loading;
