## Tasks

Work execution units that operates on a single controller and multiple cycles.

Tasks are responsible for operating a room object's controller in order to achieve a particular goal. Each task determines when it is complete.
Tasks can store data into their dedicated memory, which shape needs to be declared in `src/types.d.ts`

Agents always carry on a list of task, executing the first one of their task list until it is complete, then jumping onto another one.

Objectives assign tasks to agents they operate on until the objective is fulfilled.
