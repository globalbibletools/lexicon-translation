//  This script will be used to extract the Hebrew treeitems from the
//  UBS Hebrew Dictionary *.json file and write them to a new file called hebrew-treeitems.json
//  The treeitems will be used to populate a TreeView in a VS Code extension.

// Fields in the Hebrew Dictionary *.json file to extract:
// - "MainId": Extract the first 6 characters
// - "Lemma":
//  - "AlphaPos":

// The data extracted will be used to create a JSON format as follows:
[
  {
    level: Number,
    code: string,
    label: string,
    command: string,
  },
];

// - level will indicate the level in the tree. 1 is top level, 2. is its sublevel, etc.
// - code will be used to indicate the order of each tree item in each level
//   example: level 1 items will have  a 3 character code 001, 002, 003, etc to allow sorting
//   example: level 2 items will have a 6 character code where the first 3 is the level 1 parent code
//              and then next 3 characters will be the sort order of the 2nd level item
//              example first item under level one is code: 0001001,
//                      2nd item under level one is code: 001002
//  The above pattern is repeated for all 3 levels
//  - label will contain the text that is displayed in the tree item view
//  - command only applies to level 3 items as they represent the word (lemma).
//    It will contain the value of MainId.

// Dictionary entry in the input file will create 1 to 3 items in the output fle.
// This is because we will have only one instance of level 1 and level 2 tree items.
// However in the input file, these will be repeated for each dictionary entry.
// Therefore they will not be duplicated in the output file.
