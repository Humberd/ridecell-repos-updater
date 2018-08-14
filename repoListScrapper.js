function getText(id) {
  const elem = $(`#org-repositories > div.col-8.d-inline-block > div > li:nth-child(${id}) > div.d-inline-block.mb-1 > h3 > a`)
  return {
    text: elem.text.trim(),
    url: `https://github.com${elem.attributes.href.value}.git`
  }
}

results = []
for (let i = 2; i<32; i++) {
  results.push(getText(i))

}

console.log(JSON.stringify(results));
