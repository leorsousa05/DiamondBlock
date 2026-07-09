export class ParserRegistryImpl {
    parsers = new Map();
    register(language, parser) {
        this.parsers.set(language, parser);
    }
    findParser(file) {
        for (const parser of this.parsers.values()) {
            if (parser.canParse(file)) {
                return parser;
            }
        }
        return null;
    }
}
//# sourceMappingURL=parser_registry_impl.js.map