import React from "react";
import { HStack, Text, Box, StatusBar } from "native-base";
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {faSearch } from '@fortawesome/free-solid-svg-icons';

export default function Header(){
  return (
        <>
            <StatusBar backgroundColor="#3700B3" barStyle="light-content" />
    
            <Box safeAreaTop backgroundColor="#6200ee" />
    
            <HStack bg='#6200ee' px={1} py={3} justifyContent='space-between' alignItems='center'>
              <HStack space={4} alignItems='center'>
                <Text color="white" fontSize={20} fontWeight='bold'>Home</Text>
              </HStack>
              <HStack space={4}>
              <FontAwesomeIcon  icon={faSearch} />            
              <FontAwesomeIcon  icon={faSearch} />            

              </HStack>
            </HStack>
    
        </>
      )
}

