#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "call_graph.h"
#include "csv.h"
#include "edge.h"
#include "hashtable.h"
#include "invoke.h"
#include "map.h"
#include "method.h"

void create_edges(call_graph_t* cg)
{
    ht* edges_ht = ht_create(NULL);
    edge_t* prev_edge = NULL;

    int id = 0;

    for (invoke_t* invoke = cg->invokes; invoke != NULL; invoke = invoke->next) {
        // Create edges from caller to all targets
        for (int i = 0; i < invoke->target_count; i++) {
            method_t* source = invoke->method;
            method_t* target = invoke->targets[i];
            char* key = edge_key(source->id, target->id);

            if (ht_get(edges_ht, key) != NULL) {
                // Edge already exists
                free(key);
                continue;
            }

            edge_t* edge = edge_create(source, target, id++);
            ht_insert(edges_ht, key, edge);
            free(key);
            cg->edge_count++;

            if (prev_edge != NULL) {
                prev_edge->next = edge;
            } else {
                cg->edges = edge;
            }
            prev_edge = edge;
        }
    }

    ht_destroy(edges_ht);
}

void compute_reachability(call_graph_t* cg)
{
    // Set all entrypoints to reachable
    ht_iter it = ht_iterator(cg->methods);
    while (ht_next(&it)) {
        method_t* m = it.value;
        if (m->is_entrypoint) {
            m->is_reachable = true;
            cg->reachable_count++;
        }
    }

    int changed;
    do {
        changed = 0;
        for (edge_t* e = cg->edges; e != NULL; e = e->next) {
            if (!e->source->is_reachable) {
                continue;
            }

            if (!e->target->is_reachable) {
                e->target->is_reachable = true;
                e->target->value = 1;
                cg->reachable_count++;
                changed++;
            }
        }
    } while (changed > 0);

    // Abstract methods
    for (invoke_t* i = cg->invokes; i != NULL; i = i->next) {
        if (i->method->is_reachable && !i->target->is_reachable) {
            i->target->is_reachable = true;
            cg->reachable_count++;
        }
    }
}

call_graph_t* call_graph_create(char* dirname, char* name)
{
    call_graph_t* cg = malloc(sizeof(call_graph_t));
    if (cg == NULL) {
        return NULL;
    }

    cg->name = malloc(strlen(name) + 1);
    strcpy(cg->name, name);
    cg->methods = ht_create(method_destroy);
    cg->other_graph = NULL;

    method_map_t* methods_by_id = method_map_create();
    invoke_map_t* invokes_by_id = invoke_map_create();
    csv_load_methods(dirname, &cg->methods, methods_by_id);
    csv_load_invokes(dirname, &cg->invokes, methods_by_id, invokes_by_id);
    csv_load_targets(dirname, methods_by_id, invokes_by_id);
    method_map_destroy(methods_by_id);
    invoke_map_destroy(invokes_by_id);

    cg->method_count = cg->methods->size;
    cg->edge_count = 0;
    create_edges(cg);
    compute_reachability(cg);

    return cg;
}

void call_graph_destroy(call_graph_t* cg)
{
    ht_destroy(cg->methods);
    invoke_destroy(cg->invokes);
    edge_t* next;
    for (edge_t* e = cg->edges; e != NULL; e = next) {
        next = e->next;
        edge_destroy(e);
    }
    free(cg->name);
    free(cg);
}

void call_graph_print(call_graph_t* cg)
{
    printf("%s: %d methods (%d reachable), %d edges\n", cg->name, cg->method_count,
           cg->reachable_count, cg->edge_count);
}

void purge_common_edges(call_graph_t* cg)
{
    edge_t* prev = NULL;
    edge_t* next;
    for (edge_t* e = cg->edges; e != NULL; e = next) {
        next = e->next;
        if (e->target->equivalent == NULL || !e->target->equivalent->is_reachable) {
            prev = e;
            continue;
        }
        if (prev != NULL) {
            prev->next = next;
        } else {
            cg->edges = next;
        }
        cg->edge_count--;
        edge_destroy(e);
    }
}

void link_equivalents(call_graph_t* cg1, call_graph_t* cg2)
{
    ht_iter it = ht_iterator(cg1->methods);

    while (ht_next(&it)) {
        method_t* m1 = it.value;
        method_t* m2 = ht_get(cg2->methods, m1->qualified_name);
        if (m2 != NULL) {
            m1->equivalent = m2;
            m2->equivalent = m1;
        }
    }
}

int compare(const void* a, const void* b)
{
    double a_value = (*(edge_t**)a)->value;
    double b_value = (*(edge_t**)b)->value;
    return b_value > a_value ? 1 : -1;
}

void print_top_edges(call_graph_t* cg, int n)
{
    edge_t* edges[cg->edge_count];
    int i = 0;

    for (edge_t* e = cg->edges; e != NULL; e = e->next) {
        edges[i++] = e;
    }

    qsort(edges, cg->edge_count, sizeof(edge_t*), compare);

    int count = 0;

    for (int i = 0; count < n && i < cg->edge_count; i++) {
        if (edges[i]->source->equivalent == NULL) {
            // Caller not present in both graphs
            continue;
        }
        edge_print(edges[i]);
        count++;
    }
}
