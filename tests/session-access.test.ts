import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fresh_saved_session } from '../src/engine/session-storage.ts';
import { standard_data_state } from '../src/engine/auto-edit.ts';
import { ACCESS } from '../src/ui/udgaver.ts';
import { sessionForEdition, VISUAL_SETTINGS_FIELDS } from '../src/ui/session-access.ts';

test('lokal og intern beholder den gemte session uændret', () => {
  const session = fresh_saved_session();
  session.values.input = 12;
  session.data.designdiagrammer[0].rows[0].t_uarmeret_cm = 123;
  for (const edition of [ACCESS.lokal, ACCESS.intern])
    assert.equal(sessionForEdition(session, edition), session);
});

test('offentlig session bruger standarddata, men beholder materialer, værdier og visningsfelter', () => {
  const session = fresh_saved_session();
  session.values.input = 12;
  session.data.materialer[0].phi = 41;
  session.data.designdiagrammer[0].rows[0].t_uarmeret_cm = 123;
  session.data.vejdim_koersel_raekker[0].t_SG_mm += 10;
  session.data.indstillinger.afrunding.trin_mm = 10;
  session.data.indstillinger.opbygning.enhed = 'cm';
  session.data.indstillinger.opbygning.geonet_paaskrift = false;
  session.data.indstillinger.opbygning.maal_streg = false;
  session.data.indstillinger.opbygning.maal_tal = false;
  session.data.indstillinger.opbygning.signatur = false;
  session.data.indstillinger.afrunding.vis_eksakt = true;

  const prepared = sessionForEdition(session, ACCESS.offentlig);
  const standard = standard_data_state();
  assert.deepEqual(prepared.data.designdiagrammer, standard.designdiagrammer);
  assert.deepEqual(prepared.data.vejdim_koersel_raekker, standard.vejdim_koersel_raekker);
  assert.equal(
    prepared.data.indstillinger.afrunding.trin_mm,
    standard.indstillinger.afrunding.trin_mm,
  );
  assert.equal(prepared.data.indstillinger.opbygning.enhed, 'cm');
  assert.equal(prepared.data.indstillinger.opbygning.geonet_paaskrift, false);
  assert.equal(prepared.data.indstillinger.opbygning.maal_streg, false);
  assert.equal(prepared.data.indstillinger.opbygning.maal_tal, false);
  assert.equal(prepared.data.indstillinger.opbygning.signatur, false);
  assert.equal(prepared.data.indstillinger.afrunding.vis_eksakt, true);
  assert.deepEqual(prepared.data.materialer, session.data.materialer);
  assert.deepEqual(prepared.values, session.values);
});

test('listen over visningsindstillinger indeholder præcis de seks tilladte felter', () => {
  assert.deepEqual(
    VISUAL_SETTINGS_FIELDS.map(({ key }) => key),
    [
      'ind_opb_enhed',
      'ind_opb_paaskrift',
      'ind_opb_maal_streg',
      'ind_opb_maal_tal',
      'ind_opb_signatur',
      'ind_afr_vis_eksakt',
    ],
  );
});
