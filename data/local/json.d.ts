// Define the structure of each item in the JSON array
interface GreekWordData {
  level: number;
  key: string;
  label: string;
  fileName: string;
}

interface HebrewWordData {
  level: number;
  key: string;
  label: string;
  fileName: string;
}

// Declare the module and its default export type
declare module 'treeViewGreekWordData.json' {
  const value: GreekWordData[];
  export default value;
}

declare module 'treeViewHebrewWordData.json' {
  const value: HebrewWordData[];
  export default value;
}