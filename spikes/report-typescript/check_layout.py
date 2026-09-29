"""Measure layout drift independently of the calculation/reference tolerances."""
from difflib import SequenceMatcher
import json
from pathlib import Path
import re
import pdfplumber

ROOT = Path(__file__).resolve().parents[2]
WORK = ROOT/'.local/report-prototype'


def lines(path):
    with pdfplumber.open(path) as pdf:
        output = []
        for page_number, page in enumerate(pdf.pages,1):
            for line in page.extract_text_lines():
                # Exclude page furniture, but retain all body lines and their coordinates.
                if not 80 < line['top'] < 762:
                    continue
                output.append({'page':page_number, 'text':re.sub(r'\s+',' ',line['text']).strip(),
                               'x':line['x0'], 'y':line['top']})
        return len(pdf.pages), output


if __name__ == '__main__':
    results = []
    for name in json.loads((WORK/'case-index.json').read_text())['cases']:
        old_pages, old = lines(WORK/'baseline-pdf'/f'{name}.pdf')
        new_pages, new = lines(WORK/'typst'/f'{name}.pdf')
        match = SequenceMatcher(None,[x['text'] for x in old],[x['text'] for x in new],autojunk=False)
        pairs = [(old[i+k],new[j+k]) for i,j,n in match.get_matching_blocks() for k in range(n)]
        unmatched = [{'kind':tag,'original':[x['text'] for x in old[i:j]],'typst':[x['text'] for x in new[k:l]]}
                     for tag,i,j,k,l in match.get_opcodes() if tag != 'equal']
        same_page = [(a,b) for a,b in pairs if a['page']==b['page']]
        result = {'case':name,'pages_original':old_pages,'pages_typst':new_pages,
                  'body_lines_original':len(old),'body_lines_typst':len(new),'identical_lines':len(pairs),
                  'identical_lines_on_other_page':len(pairs)-len(same_page),
                  'max_x_shift_pt':round(max((abs(a['x']-b['x']) for a,b in same_page),default=0),3),
                  'max_y_shift_pt':round(max((abs(a['y']-b['y']) for a,b in same_page),default=0),3),
                  'different_linebreaks':unmatched}
        results.append(result)
        print({k:v for k,v in result.items() if k != 'different_linebreaks'})
    (WORK/'layout-checks.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
    if any(r['pages_original'] != r['pages_typst'] or r['different_linebreaks'] or r['identical_lines_on_other_page'] for r in results):
        raise SystemExit('Report line wrapping or page assignment differs from the frozen Word reference')
