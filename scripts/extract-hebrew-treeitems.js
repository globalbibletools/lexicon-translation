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
    description: string,
    command: string,
  },
];

// - level: will indicate the level in the tree. 1 is the top level, 2. is its sublevel, etc.
// - code: A map will be used to store treeItem instances for the treeView.
//       the code field will be used as the key in the map.
//       the value of the map will be an instance of treeItem.
//       The key of the map is used to allow for easy access of the children of treeItem selected by the user.
//       example: level 1 items will start with the number "1" followed
//           follow by "H" or "G" for Hebrew or Greek
//           followed by a 3 character code: 001, 002, 003, etc to allow for sorting
//           Therefore the first item in a Hebrew treeView would be "1H001"
//       example: level 2 items will start with the number "2" followed by the level 1 code plus a 3 character code as used in level 1:
//           and then next 3 characters will be the sort order of the 2nd level item
//           example first Hebrew item under level one is code: 2H0001001,
//                   2nd item under level one is code: 2H001002
//           The above pattern is repeated for all 3 levels
//
//  - label: Will contain the text that is displayed in the tree item view
//  - description: contains secondary information displayed to the user.
//        In this application it will contain the number direct descendants in parenthesis.
//  - command: only applies to items will execute a command when selected by the user.
//        In this application it will contain the value of MainId, which the file name minus the extension.

// Each Dictionary entry in the input file will create 1 to 3 items in the output fle.
// This is because we will have only one instance of level 1 and level 2 tree items.
// However in the input file, these will be repeated for each dictionary entry.
// Therefore they will not be duplicated in the output file.
