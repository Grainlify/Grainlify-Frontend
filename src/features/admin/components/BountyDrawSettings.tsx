import { useEffect, useMemo, useState } from 'react';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { getDrawSettings, resetDrawSetting, setDrawSetting, type DrawSetting } from '../../../shared/api/client';

/**
 * The draw's platform-wide settings: window lengths, weights, the automatic
 * draw switch.
 *
 * This is all the admin keeps of the draw. Running it, unassigning,
 * redrawing and moving deadlines belong to whoever maintains the bounty's
 * repository, and live on the Maintainer tab, where the server checks that
 * per bounty.
 *
 * The settings are editable because a window length or a weight is exactly
 * what needs changing during a live programme, and the person who needs to
 * change it is not the person who can deploy. Each row shows the coded default
 * beside the live value, so an override is visible as an override.
 */
export function BountyDrawSettings() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [settings, setSettings] = useState<DrawSetting[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    // Defaulting to [] rather than trusting the shape: an agent that answers
    // with something unexpected must not take the admin page down with it.
    getDrawSettings()
      .then((r) => setSettings(r?.settings ?? []))
      .catch((e) => setError(String(e instanceof Error ? e.message : e)));
  }, []);

  const sections = useMemo(() => {
    const by = new Map<string, DrawSetting[]>();
    for (const s of settings) by.set(s.section, [...(by.get(s.section) ?? []), s]);
    return [...by.entries()];
  }, [settings]);

  const save = async (key: string, value: string) => {
    setSaving(key);
    setError(null);
    try {
      setSettings((await setDrawSetting(key, value)).settings);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(null);
    }
  };
  const reset = async (key: string) => {
    setSaving(key);
    try {
      setSettings((await resetDrawSetting(key)).settings);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(null);
    }
  };

  const strong = isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]';
  const muted = isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]';
  const box = `rounded-[16px] border p-4 ${isDark ? 'bg-white/[0.06] border-white/10' : 'bg-white/[0.35] border-white/30'}`;
  const input = `min-h-[40px] px-3 rounded-[10px] border text-[13px] ${isDark ? 'bg-white/[0.06] border-white/15 text-[#f5f5f5]' : 'bg-white/[0.6] border-black/15 text-[#2d2820]'}`;
  const btn = 'inline-flex items-center justify-center min-h-[40px] px-4 rounded-[10px] text-[13px] font-semibold border transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const secondary = `${btn} ${isDark ? 'border-white/15 bg-white/[0.06] text-[#d4d4d4]' : 'border-black/15 bg-white/[0.20] text-[#2d2820]'}`;

  return (
    <div className="space-y-6">
      {error && (
        <p role="alert" className={`text-[13px] ${isDark ? 'text-[#f0b4a8]' : 'text-[#8a3a28]'}`}>
          {error}
        </p>
      )}
      <div className={box}>
        <h3 className={`text-[15px] font-bold mb-1 ${strong}`}>Settings</h3>
        <p className={`text-[12.5px] mb-4 ${muted}`}>
          These take effect immediately, without a deploy. A value left alone uses the default written in the code, so clearing an override
          is always a safe way back.
        </p>
        {sections.map(([section, rows]) => (
          <div key={section} className="mb-5">
            <p className={`text-[11px] font-bold uppercase tracking-wide mb-2 ${muted}`}>{section}</p>
            <div className="space-y-3">
              {rows.map((s) => (
                <div key={s.key} className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <label htmlFor={`setting-${s.key}`} className={`text-[13px] font-medium ${strong}`}>
                      {s.key}
                    </label>
                    <p className={`text-[12px] ${muted}`}>{s.description}</p>
                    {s.overridden && (
                      <p className={`text-[11.5px] ${muted}`}>
                        Overridden (default {s.default}){s.updatedBy ? ` by ${s.updatedBy}` : ''}
                      </p>
                    )}
                  </div>
                  {s.type === 'bool' ? (
                    <select
                      id={`setting-${s.key}`}
                      className={`${input} w-full sm:w-36`}
                      value={s.value}
                      disabled={saving === s.key}
                      onChange={(e) => save(s.key, e.target.value)}
                    >
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </select>
                  ) : (
                    <input
                      id={`setting-${s.key}`}
                      className={`${input} w-full sm:w-36`}
                      defaultValue={s.value}
                      disabled={saving === s.key}
                      onBlur={(e) => e.target.value !== s.value && save(s.key, e.target.value)}
                    />
                  )}
                  <button type="button" className={secondary} disabled={!s.overridden || saving === s.key} onClick={() => reset(s.key)}>
                    Reset
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
