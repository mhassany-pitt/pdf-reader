## [pdf-store](./pdf-store/)
nestjs app to store and serve the pdf documents.

## [pdf-reader](./pdf-reader/)
angular app to load and view the pdf documents.

## TODO

*vision (what i want it to be)*: a pdf-reader that support multiple type of annotations (highlight, underline, line-through, redact, freeform drawing - handwritten notes) or content embedding (video/audio/html/...). author should be able to define a pdf document and share it with others (through configured links - which specifies what features should be available while reading). this pdf-reader can be used through iframe and interacted programatically through its api (browser messaging).

- ~~in annotator-embed, add target=inline-iframe support, so the the content can be embeded inline into pdf~~
- ~~then obviously the inline-iframe should be resizable and repositionable~~
- ~~create an option so the author can add selected text as the section into the outline~~
- ~~create an interaction logger to log reader interaction with the document~~
- add auth so the author login and define documents 
  - everyone view their own documents (no community sharing at this time)
- author can create (multiple) shareable link from the document 
  - each link can be configured to allow interaction logging or other features (feature toggles)
- use a mongodb to store this data
- implement backend service to store annotations on the server (currently in localStorage)
- since the pdf-reader will be used via an iframe, work on a basic interaction api
  - things like navigating to a page, or being notified about page changes or ...
- readers should be able to have the option to filter annotations (seeing others annotations or type)
