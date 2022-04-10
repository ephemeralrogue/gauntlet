This was my attempt to create a mocking library for Discord.js. Abandoned for
now due to stuff in real life and, to be honest, lack of motivation.
([Context](https://github.com/discordjs/discord.js/discussions/6179))

I’m publishing this code so that it may be useful for someone else. The code is
pretty messy and I was in the process of refactoring everything, hence the
[`main` branch][main] and the [`old` branch][old] with the old version.

- I initially did a *very* rough version when I subclassed all the discord.js
  classes and overrode all the methods. This is can be found
  [in `oldSrc` in the `old` branch](https://github.com/cherryblossom000/discord.js-mock/tree/old/oldSrc).
- Quickly realising the above was a bad idea, I was refactoring it to override
  the `Client#api` property instead. I never finished this though. This can be
  found [in the `old` branch][old].
- Then I decided to refactor the code again, which is what’s in the
  [`main` branch][main].

Sorry for the disorganisation and not really following OOP like the rest of the
discord.js community tends to do.

If you have any questions about the code or anything else really, feel free to
[open a discussion](https://github.com/cherryblossom000/discord.js-mock/discussions/new?category=general).

[main]: https://github.com/cherryblossom000/discord.js-mock/tree/main
[old]: https://github.com/cherryblossom000/discord.js-mock/tree/old
