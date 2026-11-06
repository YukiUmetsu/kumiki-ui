# Reference teardown: what the best short explainers do

Date: 2026-11-06. Tool: `npm run video:measure`, and a look at sampled frames. Scope: a first set of 10 reference videos, compared with the example film.

## The set

| Group | Videos |
|---|---|
| Top short explainers (9:16, 28 to 70 s) | Kurzgesagt: *What If You Never Slept?*, *How ADHD Medication Works*. Zack D. Films: *How Chaos Theory Works*, *How Beep Baseball Works*, *Can A Banana Peel Protect You From Fire?*. Veritasium: *When you lose weight where does it go?*. Two more science shorts: *How Laparoscopic Surgery Works*, *Your Map Shows Antarctica Wrong* |
| Open-licence explainers (16:9, about 2 min) | simpleshow foundation: *Open Data explained in a nutshell*, *The Nobel Prize explained in a nutshell* (Wikimedia Commons, CC BY-SA 3.0) |

The shorts were measured from low-resolution copies, which were deleted after. No frame of a reference video is in this repository.

**Limits of the set.** YouTube stopped the downloads with a bot check after 8 shorts. That check was not worked around. So the set has no long-form Kurzgesagt, TED-Ed, Vox or Johnny Harris video. The two open-licence videos are older work in a whiteboard style, and they are a weak stand-in for long-form. Ten videos give a direction, not a law.

## Numbers

| Video | Seconds | Cuts a minute | Events in 10 s | Still | Longest still | First change |
|---|---|---|---|---|---|---|
| Kurzgesagt, sleep | 70 | 3.4 | 6.1 | 2% | 1.1 s | 2.3 s |
| Kurzgesagt, ADHD | 70 | 6.9 | 5.6 | 0% | 0 s | 0.3 s |
| Zack D. Films, chaos | 47 | 0 | 1.7 | 0% | 0 s | 0.03 s |
| Zack D. Films, beep baseball | 33 | 0 | 3.6 | 0% | 0 s | 0.03 s |
| Zack D. Films, banana | 28 | 0 | 2.5 | 0% | 0 s | 0.03 s |
| Veritasium, weight | 69 | 26.0 | 5.6 | 0% | 0 s | 0.04 s |
| Surgery short | 33 | 18.3 | 7.0 | 0% | 0 s | 0.04 s |
| Antarctica short | 38 | 25.4 | 7.7 | 0% | 0 s | 0.04 s |
| simpleshow, Open Data | 123 | 0 | 5.9 | 35% | 2.8 s | 1.2 s |
| simpleshow, Nobel Prize | 142 | 0 | 5.3 | 28% | 3.4 s | 1.0 s |
| **Example film, before this work** | 21 | 0 | 5.7 | **34%** | 2.0 s | 0.03 s |

An event is a peak of change between frames: a cut, a pop, a fast move or a transition.

**The clear finding: the best shorts are never still.** Every top short is still for 0% to 2% of its length. The example film was still for 34%, which is the pace of the 2015 whiteboard videos. The number of events does not explain the difference. The example film had as many events as the Kurzgesagt shorts. The difference is what happens between events: in the top shorts, something always moves.

**Cuts do not define the style.** Zack D. Films uses no cut at all: one continuous 3D camera move. Veritasium uses 26 cuts a minute. Both hold attention. A cut rate is not a target.

## What the frames show

These come from reading sampled frames of three shorts (Kurzgesagt sleep, Zack D. Films chaos, Veritasium weight). They are observations by an agent, not measurements.

1. **A voice tells the story. The screen text only echoes it.** All three are narrated. The caption is 2 to 4 spoken words, in one fixed place, in small type. No frame asks the viewer to read a sentence.
2. **One thing, large, in the middle.** One subject fills 40% to 60% of the frame. Other text is a short pill on the object: "Healthy Brain", "Tau Proteins", "109.23°".
3. **The picture changes with each phrase, and the subject stays.** The same brain, the same five rods, the same face return in new states. The viewer follows one object through the whole film.
4. **The first frame is the question or the action.** Kurzgesagt holds the question as a large title over a face for 3 s. Zack D. Films starts with a hand that lets go of the rods at frame 0.
5. **The viewer guesses first, then is corrected.** Veritasium asks people where lost fat goes, shows wrong answers, then shows the right one with a check mark. The viewer makes the same wrong guess, so the answer lands as a surprise.
6. **Concrete before abstract.** Chaos theory starts with real rods and real angles. The formula comes later. The butterfly and the tornado come last, as the payoff.
7. **A comparison uses the same frame twice.** "Healthy Brain" and "Alzheimer's Disease" have the same layout and the same size, and differ in one thing.
8. **A new section gets a new background colour.**

## What this changed in the example film

The owner said that the film was hard to understand. The teardown explains why: it had no voice, it asked the viewer to read, its question hid the numbers, and it told its cause as a list of text.

| Before | After | Finding |
|---|---|---|
| "Why does the bill not match the receipt?" | "Your bill says $120. Your receipt says $100. Which one is wrong?" then "Neither." | 4, 5, 6 |
| A text list: "A late fee is added", "The bill updates", ... | One object story: Monday you pay $100, Wednesday a $20 late fee, Friday the bill says $120. The $100 and the $20 travel into the bill | 3, 6 |
| A wallet and "Payment closes the gap", which did not follow | Removed. The film ends on the proof: a second receipt for the $20 fee arrives, both amounts travel into the bill, and the caption says "$100 + $20 match the bill" | 3, 6 |
| Still for 34% | A slow 4% push-in across each scene (`drift`) | Numbers |
| Three scene styles | One photo and one object world, joined by a match on the receipt | 3 |

See the [slice report](2026-11-06-research-slice.md) for the measures of the new film.

## Not done

- **Voice.** Finding 1 is the largest gap, and it is open. Kumiki makes no speech. A narration track and timing from the voice (plan 2C) are the next step.
- **One large subject.** In 9:16 the object story still uses about 20% of the frame. The review reports it.
- **Ambient motion.** `drift` moves the whole frame. The reference films move the subject itself.
- **A larger set**, with long-form work, when a source with clear rights is chosen.
