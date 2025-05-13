/**
 * File: backend/app/diff_c/map.c
 * Author: Milan Vodák <xvodak07@stud.fit.vut.cz>
 * Description: Implements functions for manipulating maps of methods and method invokes.
 */

#include <stddef.h>
#include <stdio.h>
#include <stdlib.h>

#include "invoke.h"
#include "map.h"
#include "method.h"

map_t* map_create()
{
    map_t* map = malloc(sizeof(map_t));
    if (map == NULL) {
        return NULL;
    }

    map->capacity = DEFAULT_CAPACITY;
    map->items = malloc(DEFAULT_CAPACITY * sizeof(void*));

    if (map->items == NULL) {
        free(map);
        return NULL;
    }

    return map;
}

void map_destroy(map_t* map)
{
    free(map->items);
    free(map);
}

void map_add(map_t* map, int index, void* item)
{
    if (index >= map->capacity) {
        map->capacity *= 2;
        map->items = realloc(map->items, map->capacity * sizeof(void*));
    }
    map->items[index] = item;
}

method_map_t* method_map_create() { return (method_map_t*)map_create(); }
invoke_map_t* invoke_map_create() { return (invoke_map_t*)map_create(); }

void method_map_destroy(method_map_t* map) { map_destroy((map_t*)map); }
void invoke_map_destroy(invoke_map_t* map) { map_destroy((map_t*)map); }

void method_map_add(method_map_t* map, method_t* method)
{
    map_add((map_t*)map, method->id, method);
}

void invoke_map_add(invoke_map_t* map, invoke_t* invoke)
{
    map_add((map_t*)map, invoke->id, invoke);
}

method_t* method_map_get(method_map_t* map, int method_id) { return map->items[method_id]; }

invoke_t* invoke_map_get(invoke_map_t* map, int invoke_id) { return map->items[invoke_id]; }
