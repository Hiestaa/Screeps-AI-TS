* test fix tower dumping too much energy in repairing ramparts to full
* Flag based repair: flag structures with less than 80% structure for repair, then have creeps / tower only search through flagged structures when looking for a target. Remove the flag at 100% (except for ramparts)
* Add tough to harvest after max level instead of just stopping lvl up
* Ensure Tower agent, tasks, and add to defense objective work as expected (test with invaders)
* Improve Road Planning:
  - smarter connections: connect spawn to closest source / sink, then each subsequent unconnected source / sink to the closest connected source / sink.0
  - Ensure is working by going all the way to RCL8
* test: limit harvester body parts to the max to deplete a source until it get refilled
* test: fix attempts to spawn creeps with > 50 body parts
* State management: associate an id to construction site tasks which set a value in a central store when completed. Same for room level change, and other interesting events
  - halve the number of move parts on haulers and workers when roads are complete
* Smarter rampart placement to protect the room:
  - use wall if the rampart will span over more than 5 consecutive tiles, as walls cannot be destroyed
* Consider expansion to other rooms
  - remote mining
  - colony expansion
