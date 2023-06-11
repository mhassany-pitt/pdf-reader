import json
import requests
from flask import Flask, request
from flask_cors import CORS, cross_origin

app = Flask(__name__)
app.config['JSONIFY_PRETTYPRINT_REGULAR'] = True
cors = CORS(app, resources={r"/api/*": {"origins": "*"}})


@app.route("/api/delegation/<pdfLinkId>")
@cross_origin()
def delegation(pdfLinkId):
    # in your system, this api should return the delegated configuration for the pdf link
    user_id = request.query.user_id  # use for auth
    configs = {"published": True}
    # --- following can also be defined by delegated configuration ---
    # configs["viewer"] = {
    #     "zoom": 0,
    #     "rotation": 0,
    #     "section": 0,
    #     "page": 0,
    #     "pagetop": 0,
    #     "pageleft": 0,
    #     "scrollmode": 0,
    #     "spreadmode": 0,
    # }
    return configs


@app.route("/api/annotations/<pdfDocId>")
@cross_origin()
def annotations(pdfDocId):
    # in your system, this api should return the annotations for the pdf document
    # you need to support the following methods:
    #   - @Get(':pdfDocId')
    #   - @Post(':pdfDocId')
    #   - @Patch(':pdfDocId/:id')
    #   - @Delete(':pdfDocId/:id')
    annotations = json.load(open("annotations.json", "r"))

    i = 0
    # note that you need API_KEY to access this api
    # use can use the following api to get texts within the given pdf document
    url = "http://localhost:3000/api/pdf-document-texts/646d2c84a8431e742166fb85/646cfde60af7f19c846399d2?API_KEY=demo"
    for page in requests.get(url).json():
        for text in page['texts']:
            if text['text'].lower() == 'spatial':
                page_rects = {}
                page_rects[page['page']] = [{
                    "top": text['top'], "left": text['left'],
                    "bottom": text['bottom'], "right": text['right'],
                    "width": text['width'], "height": text['height'],
                }]
                annotations.append({
                    "id": "64787fb596653d31dc2aec6b_{}".format(i),
                    "owner_id": "646d2c52d939d045dfef4cec",
                    "group_id": "646d2c84a8431e742166fb85",
                    "type": "highlight",
                    "color": "#5db221",
                    "note": "this is a note in page {}".format(page['page']),
                    "rects": page_rects
                })
                i += 1

    return annotations


@app.route("/api/interaction-logs", methods=["POST"])
@cross_origin()
def interaction_logs():
    # in your system, this api should save the interaction logs
    print('------------  interaction-logs ------------')
    print(json.dumps(request.get_json(), indent=2))
    return {}
