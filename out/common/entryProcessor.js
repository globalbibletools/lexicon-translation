"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripTranslatableTextFromEntry = stripTranslatableTextFromEntry;
const fast_xml_parser_1 = __importDefault(require("fast-xml-parser"));
const xmlParser = new fast_xml_parser_1.default.XMLParser({
    alwaysCreateTextNode: true,
    ignoreAttributes: false,
    parseTagValue: false,
    parseAttributeValue: false,
});
const xmlBuilder = new fast_xml_parser_1.default.XMLBuilder({
    ignoreAttributes: false,
    format: true,
    suppressEmptyNode: true,
});
async function stripTranslatableTextFromEntry(entry, langName) {
    const parsedEntry = xmlParser.parse(entry.content.toString());
    const lexiconEntry = parsedEntry["Lexicon_Entry"];
    stripText(lexiconEntry["Notes"]);
    for (const baseForm of contentToArray(lexiconEntry["BaseForms"]["BaseForm"])) {
        stripText(baseForm["PartsOfSpeech"]["PartOfSpeech"]);
        for (const lexMeaning of contentToArray(baseForm["LEXMeanings"]["LEXMeaning"])) {
            stripText(lexMeaning["LEXDomains"]["LEXDomain"]);
            if (langName === "hebrew") {
                stripText(lexMeaning["LEXCoreDomains"]?.["LEXCoreDomain"]);
            }
            else if (langName === "greek") {
                stripText(lexMeaning["LEXSubDomains"]?.["LEXSubDomain"]);
            }
            for (const lexSense of contentToArray(lexMeaning["LEXSenses"]["LEXSense"])) {
                stripText(lexSense["DefinitionShort"]);
                stripText(lexMeaning["Glosses"]["Gloss"]);
            }
        }
    }
    return Buffer.from(xmlBuilder.build(parsedEntry));
}
function stripText(content) {
    for (const value of contentToArray(content)) {
        value["#text"] = "";
    }
}
function contentToArray(content) {
    if (!content) {
        return [];
    }
    else if (!Array.isArray(content)) {
        return [content];
    }
    else {
        return content;
    }
}
//# sourceMappingURL=entryProcessor.js.map