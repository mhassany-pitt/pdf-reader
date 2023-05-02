const annotatorStore = (args: { groupId, skipLoading?}) => {
  const { groupId, skipLoading } = args;
  const storageKey = `${groupId}__pdf-reader-annotations`;
  const persist = () => localStorage.setItem(storageKey, JSON.stringify($.annotations));

  const $ = {
    annotations: [] as any[],
    list() {
      $.annotations = JSON.parse(localStorage.getItem(storageKey) || '[]')
    },
    create(annotation: any) {
      $.annotations.push(annotation);
      persist();
    },
    read(id: string) {
      return $.annotations.filter(a => a.id == id)[0];
    },
    update(annotation: any) {
      const prev = $.read(annotation.id);
      const index = prev ? $.annotations.indexOf(prev) : -1;
      if (index < 0)
        return;
      $.annotations[index] = annotation;
      persist();
    },
    delete(annotation) {
      $.annotations.splice($.annotations.indexOf(annotation), 1);
      persist();
    },
  };

  if (!skipLoading)
    $.list();

  return $;
};

export default annotatorStore;