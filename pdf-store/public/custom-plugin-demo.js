// note: func_name should be the same as the plugin js file name
// window.func_name = function init({ iframe, pdfjs, storage, annotator }) { ... }
window.custom_plugin_demo = function init({ iframe, pdfjs, storage, annotator }) {
  console.log('custom_plugin_demo:', iframe, pdfjs, storage, annotator);
};
