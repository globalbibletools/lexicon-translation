#!/usr/bin/env node

// Usage: ./extract-byWord-treeItems.js USB-Dictionary.JSON

//  This script will be used to extract the Hebrew/Gree treeItems from the
//  UBS Dictionary *.JSON file
// and write them to file: treeViewHebrewWordData.JSON or treeViewGreekWordData.JSON
//  The treeItems will be used to populate a find by word TreeView in a VS Code extension.

// Fields in the USB Dictionary *.json files to extract:
// - "MainId": Extract the first 6 characters
// - "Lemma":
// - "AlphaPos":

// The logic employed in this script will allow for the creation of a treeView
// with a max of 9 levels and a max of 999 items at each level.

// The logic is based on the assumption that the input file is sorted by the lemma field.

// The format used for the key field in the treeItem was derived from
// the "code" field in the USB Dictionary Lexical Domains and Contextual Domains files.

// The data extracted will be used to create a JSON file with format as follows:
// [
//   {
//     level: Number,
//     key: string,
//     label: string,
//     fileName: string,
//   },
//   {
//     level: Number,
//     key: string,
//     label: string,
//     fileName: string,
//   }
// ];

// - level: will indicate the level in the tree. 1 is the top level, 2. is its sublevel, etc.
// - key: A map will be used to store treeItem instances for the treeView.
//       the key field will be used as the key in the map.
//       the value of the map will be an instance of treeItem.
//       The key of the map is used to allow for easy access of the children of treeItem selected by the user.
//       The key is a string where the positions of the characters will contain specific information
//       Position: 1 - will indicate the level of the treeItem
//       Position: 2 - will indicate the language: "H" for Hebrew, "G" for Greek
//       Position: 3 to 5 - will be a 3 character number that will be used to sort the treeItems for level 1
//       Position: 6 to 8 - will be a 3 character number that will be used to sort the treeItems for level 2
//       Position: 9 to 11 - will be a 3 character number that will be used to sort the treeItems for level 3
//       Position: 12 to 14 - will be a 3 character number that will be used to sort the treeItems for level 4
//       example: level 1 items will start with the number "1" followed
//           follow by "H" or "G" for Hebrew or Greek
//           followed by a 3 character key: 001, 002, 003, etc to allow for sorting
//           Therefore the first item in a Hebrew treeView would be "1H001"
//       example: level 2 items will start with the number "2" followed by the level 1 key plus an additional 3 character numeric value:
//           that will be the sort order of the 2nd level item
//           example first Hebrew item under level one is key: 2H0001001,
//                   2nd item under level one is key: 2H001002
//           The above pattern is repeated for all 3 levels
//
//  - label: Will contain the text that is displayed in the tree item view
//        for level 1 it will contain: "Hebrew"
//        for level 2 it will contain: the contents of "AlphaPos"
//        for level 3 it will contain: the first 2 letters of the "Lemma" field. (local variable alphaBetaPos)
//            NOTE: the Hebrew the language is in the reverse direction of Greek
//        for level 4: it will contain the entire contents of "Lemma" field.
//  - fileName: only applies to items that will execute a command when selected by the user.
//        In this application it only applies to level 4 and will contain the first 6 characters of the "MainId" field,
//        which is the file name minus the extension.
//        This will be used to open the file for that word.
//
// Each Dictionary entry in the input file contains the information to create levels 2-4 in the treeView.
// However, we will only store the information for each level once in the output file.
// Therefore they will not be duplicated in the output file.
//
// The script will determine whether the language is Hebrew or Greek based on the name of the input file.
// If the input file name contains "Hebrew" then the language will be Hebrew.
// If the input file name contains "Greek" then the language will be Greek.

// As the routine processes the contents of the JSON input file,
// the required data will be stored into a new map with the key field as the key of the map.
// and the value being a Javascript object with this definition:
// {
//   level: Number;
//   key: string;
//   label: string;
//   fileName: string;
// }

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import console from "node:console";
import { exit } from "node:process";

// See https://nodejs.org/docs/latest/api/process.html#processargv
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error(
    `Usage: node ${process.argv[1]} <path to USB-Dictionary.JSON file>`
  );
  process.exit(1);
}

// Set global constants
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jsonFilePath = process.argv[2];
const resultMap = new Map();

// Set variables based on the language of the input file
let language;
let languageCode;
let l1Count;
let outputFile;
let diacriticsRegex;

if (jsonFilePath.toLowerCase().includes("hebrew")) {
  language = "Hebrew";
  languageCode = "H"; // Added to the key to indicate Hebrew
  l1Count = 1; // Hebrew is first item in the tree
  outputFile = "treeViewHebrewWordData.json";
  // Regular expression to match Hebrew vowel points (nikkud)
  diacriticsRegex = /[\u0591-\u05C7]/g;
} else if (jsonFilePath.toLowerCase().includes("greek")) {
  language = "Greek";
  languageCode = "G"; // Added to the key to indicate Greek
  l1Count = 2; // Greek is the second item in the tree
  outputFile = "treeViewGreekWordData.json";
  // Regular expression to match Greek diacritics
  diacriticsRegex = /\p{Mn}+/gu;
} else {
  console.error(
    "FATAL ERROR: \nInvalid file name. Language could not be determined.\n Must contain either 'Hebrew' or 'Greek' in the file name."
  );
}
const outputPath = path.join(__dirname, outputFile);

// Read and process the JSON file
fs.readFile(jsonFilePath, { encoding: "utf8" }, (err, data) => {
  if (err) {
    console.error(`FATAL ERROR: \nError reading ${jsonFilePath} file:`, err);
    return;
  }

  try {
    const entries = JSON.parse(data);
    let level = 1;
    let parentKey = "";
    let key = "";
    let l2Count = 0;
    let l3Count = 0;
    let l4count = 0;
    let fileName = "";
    let lemma = "";
    let pureLemma = ""; // Lemma without diacritics
    let alphaPos = "";
    let prevAlphaPos = "";
    let alphaBetaPos = ""; // This is the first 2 characters of the lemma field
    let prevAlphaBetaPos = "";
    let processedCount = 0;
    let totalEntries = entries.length;

    // Lets build the first level which simply contains the word "Hebrew" or "Greek"
    key = _nextKey(level, parentKey, l1Count);
    _storeTreeItem(level, key, language, "");

    console.log(
      `Processing file: ${path.basename(
        jsonFilePath
      )} with ${totalEntries} entries.`
    );

    // Let's build the rest of the tree (Level's 2 to 4) by detecting when we change from one level to another
    entries.forEach((entry) => {
      // lets get data from the entry

      fileName = entry.MainId.slice(0, 6);
      lemma = entry.Lemma;
      alphaBetaPos = _slice(language, lemma);

      // Get first character of AlphaPos field
      // We need to add this code here because some of the Greek entries have a alphaPos field
      // that contains 2 characters
      if (language === "Greek") {
        alphaPos = entry.AlphaPos.toLowerCase()
          .normalize("NFD") // normalize to decomposed form
          .replace(diacriticsRegex, "") // separate diacritics from characters
          .slice(0, 1); // get the first character
      } else {
        alphaPos = entry.AlphaPos;
      }
      // Level 2 occurs when there is change in the AlphaPos field
      // if (entry.AlphaPos !== alphaPos) {
      if (prevAlphaPos !== alphaPos) {
        level = 2;
        l2Count++;
        l3Count = 0;
        l4count = 0;

        // Store level 2 treeItem
        // alphaPos = entry.AlphaPos;
        prevAlphaPos = alphaPos;
        parentKey = _parentKey(level, key);
        key = _nextKey(level, parentKey, l2Count);
        _storeTreeItem(level, key, alphaPos, "");

        // store level 3 treeItem
        level = 3;
        l3Count++;
        parentKey = _parentKey(level, key);
        key = _nextKey(level, parentKey, l3Count);
        _storeTreeItem(level, key, alphaBetaPos, "");
        prevAlphaBetaPos = alphaBetaPos;

        // store level 4 treeItem
        level = 4;
        l4count++;
        parentKey = _parentKey(level, key);
        key = _nextKey(level, parentKey, l4count);
        _storeTreeItem(level, key, lemma, fileName);

        // A new level 3 starts where there is a change in the AlphaBetaPos
      } else if (prevAlphaBetaPos !== alphaBetaPos) {
        level = 3;
        l3Count++;
        l4count = 0;
        parentKey = _parentKey(level, key);
        key = _nextKey(level, parentKey, l3Count);
        _storeTreeItem(level, key, alphaBetaPos, "");
        prevAlphaBetaPos = alphaBetaPos;

        // store level 4 treeItem
        level = 4;
        l4count++;
        parentKey = _parentKey(level, key);
        key = _nextKey(level, parentKey, l4count);
        _storeTreeItem(level, key, lemma, fileName);
      } else {
        // Only a A new level 4 treeItem is required
        level = 4;
        l4count++;
        parentKey = _parentKey(level, key);
        key = _nextKey(level, parentKey, l4count);
        _storeTreeItem(level, key, lemma, fileName);
      }
    });

    // Convert map to array of objects for output
    const outputArray = Array.from(resultMap.values());

    // Write the result to a file
    fs.writeFile(outputPath, JSON.stringify(outputArray, null, 2), (err) => {
      if (err) {
        console.error("Error writing the output file:", err);
        return;
      }
      console.log(`Processed data has been written to ${outputPath}`);
    });
  } catch (parseError) {
    console.error("Error parsing JSON data:", parseError);
  }
});

function _nextKey(level, parentKey, levelCount) {
  const paddedLevelCount = levelCount.toString().padStart(3, "0");
  return `${level}${languageCode}${parentKey}${paddedLevelCount}`;
}

function _parentKey(level, key) {
  switch (level) {
    case 2:
      return key.slice(2, 5);
    case 3:
      return key.slice(2, 8);
    case 4:
      return key.slice(2, 11);
    default:
      console.error(
        `FATAL ERROR: \nCould not determine value of parentKey from parameters level: ${level} and key: ${key}`
      );
      exit(1);
  }
}

function _slice(language, string) {
  let pureLemma;
  let languageCode;
  if (language === "Hebrew") {
    languageCode = "he";
    // Remove Hebrew vowel points (nikkud)
    pureLemma = string.replace(diacriticsRegex, "");
  } else {
    languageCode = "el";
    // Greek proper names are captialized, so we need to convert to lowercase for the slice to work properly
    pureLemma = string
      .toLowerCase()
      .normalize("NFD") // separate diacritics from characters
      .replace(diacriticsRegex, ""); // remove diacritics
  }

  // Create a segmenter configured for grapheme clusters
  const segmenter = new Intl.Segmenter(languageCode, {
    granularity: "grapheme",
  });

  // Use the segmenter to split the string into grapheme clusters
  const segments = [...segmenter.segment(pureLemma)].map(
    (segment) => segment.segment
  );

  // Get the first two grapheme clusters
  const alphaBetaPos = segments.slice(0, 2).join("") + "...";
  return alphaBetaPos;
}

function _storeTreeItem(level, key, label, fileName) {
  if (!resultMap.has(key)) {
    resultMap.set(key, {
      level: level,
      key: key,
      label: label,
      fileName: fileName,
    });
  }
}
