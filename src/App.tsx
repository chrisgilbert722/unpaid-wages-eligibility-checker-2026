import { useState } from 'react';
import './index.css';

interface EligibilityInput {
  state: string;
  employmentType: 'w2' | '1099' | 'unsure';
  wageIssueType: 'overtime' | 'minimum-wage' | 'final-pay' | 'commissions' | 'tips' | 'other';
  timeSinceIssue: 'current' | 'less-6mo' | '6mo-1yr' | '1-2yr' | '2-3yr' | 'over-3yr';
  hasDocumentation: boolean;
  employerStillOperating: boolean;
  previouslyFiled: boolean;
  totalOwedEstimate: 'under-500' | '500-2000' | '2000-10000' | 'over-10000' | 'unknown';
}

const STATES = ["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC"];

const STATUTE_OF_LIMITATIONS: Record<string, { flsa: number; state: number }> = {
  'CA': { flsa: 2, state: 3 },
  'NY': { flsa: 2, state: 6 },
  'TX': { flsa: 2, state: 2 },
  'FL': { flsa: 2, state: 5 },
  'default': { flsa: 2, state: 2 }
};

function getStatuteLimits(state: string) {
  return STATUTE_OF_LIMITATIONS[state] || STATUTE_OF_LIMITATIONS['default'];
}

function calculateEligibility(input: EligibilityInput): { status: 'eligible' | 'likely-eligible' | 'uncertain' | 'unlikely'; score: number; factors: string[]; warnings: string[] } {
  let score = 0;
  const factors: string[] = [];
  const warnings: string[] = [];
  const limits = getStatuteLimits(input.state);

  // Employment type check
  if (input.employmentType === 'w2') {
    score += 25;
    factors.push('W-2 employee status typically provides stronger wage protections');
  } else if (input.employmentType === '1099') {
    score += 10;
    warnings.push('Independent contractors have different protections; misclassification may apply');
  } else {
    score += 15;
    warnings.push('Employment classification affects available remedies');
  }

  // Statute of limitations check
  const timeMap: Record<string, number> = {
    'current': 0,
    'less-6mo': 0.5,
    '6mo-1yr': 1,
    '1-2yr': 1.5,
    '2-3yr': 2.5,
    'over-3yr': 4
  };
  const yearsElapsed = timeMap[input.timeSinceIssue];

  if (yearsElapsed <= limits.flsa) {
    score += 25;
    factors.push(`Within FLSA statute of limitations (${limits.flsa} years)`);
  } else if (yearsElapsed <= limits.state) {
    score += 15;
    factors.push(`May be within ${input.state} state statute of limitations`);
    warnings.push('FLSA claims may be time-barred');
  } else {
    score += 0;
    warnings.push(`May exceed statute of limitations in ${input.state}`);
  }

  // Documentation
  if (input.hasDocumentation) {
    score += 20;
    factors.push('Documentation strengthens potential claims');
  } else {
    score += 5;
    warnings.push('Lack of documentation may complicate claim process');
  }

  // Employer status
  if (input.employerStillOperating) {
    score += 15;
    factors.push('Active employer increases recovery likelihood');
  } else {
    score += 5;
    warnings.push('Closed businesses may complicate recovery');
  }

  // Previous filing
  if (input.previouslyFiled) {
    score += 0;
    warnings.push('Previous filing may affect current claim options');
  } else {
    score += 10;
    factors.push('No previous filing on this matter');
  }

  // Amount consideration
  if (input.totalOwedEstimate === 'over-10000') {
    score += 5;
    factors.push('Larger amounts may warrant attorney representation');
  } else if (input.totalOwedEstimate === '2000-10000') {
    score += 5;
    factors.push('Amount may be suitable for administrative filing');
  } else if (input.totalOwedEstimate === 'under-500') {
    warnings.push('Small amounts may be more cost-effective through small claims');
  }

  let status: 'eligible' | 'likely-eligible' | 'uncertain' | 'unlikely';
  if (score >= 80) status = 'eligible';
  else if (score >= 60) status = 'likely-eligible';
  else if (score >= 40) status = 'uncertain';
  else status = 'unlikely';

  return { status, score, factors, warnings };
}

const STATUS_CONFIG = {
  'eligible': { label: 'Likely Eligible', color: '#166534', bg: 'eligible' },
  'likely-eligible': { label: 'Potentially Eligible', color: '#0369A1', bg: 'eligible' },
  'uncertain': { label: 'Requires Review', color: '#92400E', bg: 'uncertain' },
  'unlikely': { label: 'May Face Challenges', color: '#991B1B', bg: 'ineligible' }
};

function App() {
  const [values, setValues] = useState<EligibilityInput>({
    state: 'CA',
    employmentType: 'w2',
    wageIssueType: 'overtime',
    timeSinceIssue: 'less-6mo',
    hasDocumentation: true,
    employerStillOperating: true,
    previouslyFiled: false,
    totalOwedEstimate: '2000-10000'
  });

  const [showResults, setShowResults] = useState(false);

  const handleChange = (field: keyof EligibilityInput, value: string | boolean) => {
    setValues(prev => ({ ...prev, [field]: value }));
    setShowResults(false);
  };

  const result = calculateEligibility(values);
  const config = STATUS_CONFIG[result.status];

  return (
    <main style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <header style={{ textAlign: 'center', marginBottom: 'var(--space-2)' }}>
        <h1 style={{ marginBottom: 'var(--space-2)' }}>Unpaid Wages Eligibility Checker (2026)</h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.125rem' }}>Check if you may be eligible to pursue an unpaid wages claim</p>
      </header>

      <div className="card">
        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div>
              <label htmlFor="state">State of Employment</label>
              <select id="state" value={values.state} onChange={(e) => handleChange('state', e.target.value)}>
                {STATES.map(st => <option key={st} value={st}>{st}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="employmentType">Employment Type</label>
              <select id="employmentType" value={values.employmentType} onChange={(e) => handleChange('employmentType', e.target.value)}>
                <option value="w2">W-2 Employee</option>
                <option value="1099">1099 Contractor</option>
                <option value="unsure">Not Sure</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div>
              <label htmlFor="wageIssueType">Type of Wage Issue</label>
              <select id="wageIssueType" value={values.wageIssueType} onChange={(e) => handleChange('wageIssueType', e.target.value)}>
                <option value="overtime">Unpaid Overtime</option>
                <option value="minimum-wage">Minimum Wage Violation</option>
                <option value="final-pay">Final Paycheck</option>
                <option value="commissions">Unpaid Commissions</option>
                <option value="tips">Tip Violations</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label htmlFor="timeSinceIssue">Time Since Issue Occurred</label>
              <select id="timeSinceIssue" value={values.timeSinceIssue} onChange={(e) => handleChange('timeSinceIssue', e.target.value)}>
                <option value="current">Currently Ongoing</option>
                <option value="less-6mo">Less than 6 months</option>
                <option value="6mo-1yr">6 months - 1 year</option>
                <option value="1-2yr">1 - 2 years</option>
                <option value="2-3yr">2 - 3 years</option>
                <option value="over-3yr">Over 3 years</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="totalOwedEstimate">Estimated Amount Owed</label>
            <select id="totalOwedEstimate" value={values.totalOwedEstimate} onChange={(e) => handleChange('totalOwedEstimate', e.target.value)}>
              <option value="under-500">Under $500</option>
              <option value="500-2000">$500 - $2,000</option>
              <option value="2000-10000">$2,000 - $10,000</option>
              <option value="over-10000">Over $10,000</option>
              <option value="unknown">Not Sure</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', cursor: 'pointer', marginBottom: 0 }}>
              <input type="checkbox" checked={values.hasDocumentation} onChange={(e) => handleChange('hasDocumentation', e.target.checked)} />
              <span style={{ fontSize: '0.9375rem', color: 'var(--color-text-primary)' }}>I have pay stubs, time records, or other documentation</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', cursor: 'pointer', marginBottom: 0 }}>
              <input type="checkbox" checked={values.employerStillOperating} onChange={(e) => handleChange('employerStillOperating', e.target.checked)} />
              <span style={{ fontSize: '0.9375rem', color: 'var(--color-text-primary)' }}>The employer is still in business</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', cursor: 'pointer', marginBottom: 0 }}>
              <input type="checkbox" checked={values.previouslyFiled} onChange={(e) => handleChange('previouslyFiled', e.target.checked)} />
              <span style={{ fontSize: '0.9375rem', color: 'var(--color-text-primary)' }}>I have previously filed a claim about this issue</span>
            </label>
          </div>

          <button className="btn-primary" type="button" onClick={() => setShowResults(true)}>Check Eligibility</button>
        </div>
      </div>

      {showResults && (
        <>
          <div className={`card results-panel ${config.bg}`}>
            <div className="text-center">
              <p className="result-label" style={{ marginBottom: 'var(--space-2)' }}>Eligibility Assessment</p>
              <p className="result-hero" style={{ color: config.color }}>{config.label}</p>
            </div>
            <hr className="result-divider" />
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, textAlign: 'center' }}>
              Based on the information provided, your situation {result.status === 'eligible' || result.status === 'likely-eligible' ? 'appears to meet basic criteria for pursuing an unpaid wages claim' : 'may have factors that complicate a claim'}.
            </p>
          </div>

          {result.factors.length > 0 && (
            <div className="card" style={{ borderLeft: '4px solid #10B981' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-4)', color: '#166534' }}>Favorable Factors</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 'var(--space-3)' }}>
                {result.factors.map((f, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', fontSize: '0.9375rem', color: 'var(--color-text-secondary)' }}>
                    <span style={{ color: '#10B981', fontSize: '1rem', lineHeight: 1.4 }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.warnings.length > 0 && (
            <div className="card" style={{ borderLeft: '4px solid #F59E0B' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-4)', color: '#92400E' }}>Considerations</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 'var(--space-3)' }}>
                {result.warnings.map((w, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', fontSize: '0.9375rem', color: 'var(--color-text-secondary)' }}>
                    <span style={{ color: '#F59E0B', fontSize: '1rem', lineHeight: 1.4 }}>!</span>
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="card" style={{ borderLeft: '4px solid var(--color-primary)' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-4)' }}>Recommended Next Steps</h3>
            <ol style={{ listStyle: 'decimal', paddingLeft: 'var(--space-5)', margin: 0, display: 'grid', gap: 'var(--space-3)' }}>
              <li style={{ fontSize: '0.9375rem', color: 'var(--color-text-secondary)' }}>Gather all available documentation (pay stubs, time records, employment agreements)</li>
              <li style={{ fontSize: '0.9375rem', color: 'var(--color-text-secondary)' }}>Contact your state labor department to understand filing procedures</li>
              <li style={{ fontSize: '0.9375rem', color: 'var(--color-text-secondary)' }}>Consider consulting with an employment attorney for personalized advice</li>
              <li style={{ fontSize: '0.9375rem', color: 'var(--color-text-secondary)' }}>Act promptly to preserve your rights under applicable statutes of limitations</li>
            </ol>
          </div>
        </>
      )}

      <div className="ad-container"><span>Advertisement</span></div>

      <div style={{ maxWidth: 600, margin: '0 auto', fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
        <p>This eligibility checker provides general information only and is not legal advice. Labor laws vary by state and situation. The results do not guarantee eligibility for recovery or success in any claim. Consult a qualified employment attorney for advice specific to your circumstances.</p>
      </div>

      <footer style={{ textAlign: 'center', padding: 'var(--space-8) var(--space-4)', color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border)', marginTop: 'var(--space-8)' }}>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 'var(--space-4)', fontSize: '0.875rem' }}>
          <li>Not legal advice</li><li>•</li><li>Laws vary by state</li><li>•</li><li>Consult an attorney</li>
        </ul>
        <p style={{ marginTop: 'var(--space-4)', fontSize: '0.75rem' }}>&copy; 2026 Unpaid Wages Eligibility Checker</p>
      </footer>

      <div className="ad-container ad-sticky"><span>Advertisement</span></div>
    </main>
  );
}

export default App;
