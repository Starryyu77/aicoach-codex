# Official Source Trace Registry

This registry defines how Road to Summer cites official or organization-published framework sources inside `plan_card.official_source_trace`.

The agent should not paste long copyrighted text. It should cite the source, name the source location, summarize the principle in its own words, and explain how that principle changed the current plan.

User-facing language rule:

- Write `chat_message`, `source_note`, `principle`, `applied_decision`, and `why_it_matters` in Chinese.
- Do not display official sources as a standalone evidence column in the user experience.
- Use `source_note` to make the source feel like coaching, not paperwork.

Example `source_note`:

```text
教练依据：这里参考 NSCA 的训练结构原则，把胸托哑铃划船放在高位下拉后补水平拉，不重复堆同一个角度。
```

## Source Trace Schema

```json
{
  "framework": "",
  "model": "",
  "official_source": "",
  "source_url": "",
  "source_location": "",
  "principle": "",
  "applied_decision": "",
  "why_it_matters": ""
}
```

## NASM OPT Model

- `framework`: `NASM OPT`
- `model`: `Optimum Performance Training Model`
- `official_source`: `NASM OPT Model`
- `source_url`: `https://www.nasm.org/certified-personal-trainer/the-opt-model`
- `source_location`: `The OPT Model page; five phases: Stabilization Endurance, Strength Endurance, Muscular Development/Hypertrophy, Maximal Strength, Power.`
- `principle`: Choose the training phase before choosing intensity. Regress toward stabilization/control when readiness, pain, or technique does not support high-intensity work.
- `applied_decision`: Explain the selected or regressed phase for the current session.
- `why_it_matters`: The user can see why the plan is not simply a random body-part split.

## ACE IFT Model

- `framework`: `ACE IFT`
- `model`: `ACE Integrated Fitness Training Model`
- `official_source`: `ACE IFT Model`
- `source_url`: `https://www.acefitness.org/fitness-certifications/personal-trainer-certification/ace-ift-model.aspx`
- `source_location`: `ACE IFT Model page; individualized programs and function-health-fitness-performance continuum.`
- `principle`: Start from the user's actual ability, context, confidence, preference, and adherence constraints.
- `applied_decision`: Explain how preferences, location, equipment, or confidence changed the plan.
- `why_it_matters`: The user can see the plan is adapted to them rather than copied from a generic template.

## NSCA Program Design

- `framework`: `NSCA Program Design`
- `model`: `NSCA program design / Essentials of Personal Training`
- `official_source`: `NSCA Determination of Resistance Training Frequency`
- `source_url`: `https://www.nsca.com/education/articles/kinetic-select/determination-of-resistance-training-frequency/`
- `source_location`: `NSCA article; frequency depends on exercise selection, muscle groups per session, volume/intensity, training status, fitness level, and stress.`
- `principle`: Decide session structure, order, frequency, recovery, and total load from training status and recent stress.
- `applied_decision`: Explain why the session repeats, avoids, or redistributes a muscle group or movement pattern.
- `why_it_matters`: The user can see why recent training records change today's plan.

## ACSM 2026 Resistance Training Position Stand

- `framework`: `ACSM 2026`
- `model`: `Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults`
- `official_source`: `ACSM 2026 Resistance Training Guidelines Update`
- `source_url`: `https://acsm.org/resistance-training-guidelines-update-2026/`
- `source_location`: `ACSM 2026 update; outcomes include strength, hypertrophy, power, and physical performance; variables should be individualized and consistency matters.`
- `principle`: Map the desired outcome to variables such as load, volume, rest, speed intent, and weekly consistency.
- `applied_decision`: Explain why the plan uses a given sets/reps/RPE/rest range.
- `why_it_matters`: The user can see that variables are tied to training outcomes rather than guessed.

## RPE / RIR Autoregulation

- `framework`: `RPE/RIR Autoregulation`
- `model`: `Repetitions in Reserve and readiness-based autoregulation`
- `official_source`: `NSCA Coach: Using Intensity Based on Sets and Repetitions`
- `source_url`: `https://www.nsca.com/education/articles/nsca-coach/using-intensity-based-on-sets-and-repetitions-over-50-years-of-experience-a-brief-overview-of-load-setting-and-programming-strategy/`
- `source_location`: `Autoregulation and Repetitions in Reserve sections; training variables can be adjusted from daily performance, fatigue, readiness, and RIR.`
- `principle`: Use the user's immediate performance and perceived effort to adjust load, reps, sets, rest, or exercise choice.
- `applied_decision`: Explain why a plan gives an RPE/RIR target or why a patch changes rest/load/sets.
- `why_it_matters`: The user can see why the agent does not blindly follow the original plan when training feedback changes.
